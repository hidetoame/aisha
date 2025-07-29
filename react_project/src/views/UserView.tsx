import React, { useState, useCallback, useEffect } from 'react';
import { MenuExecutionPanel } from '../components/panels/MenuExecutionPanel';
import { GeneratedImagesPanel } from '../components/panels/GeneratedImagesPanel';
import { DirectionSelectionModal } from '../components/modals/DirectionSelectionModal';
import {
  GeneratedImage,
  SuzuriItem,
  GoodsCreationRecord,
  User,
  ActionAfterLoadType,
  CreditsRequestParams,
  MenuExecutionFormData,
  AspectRatio,
} from '../types';
import { EXTEND_IMAGE_CREDIT_COST } from '../constants';
import { useToast } from '@/contexts/ToastContext';
import { useMenus } from '@/contexts/MenusContext';
import {
  convertFormDataToRequestParams,
  executeMenu,
} from '@/services/api/menu-execution';
import { useCredits, useCreditsActions } from '@/contexts/CreditsContext';
import { consumeCredits } from '@/services/api/credits';
import { expandImage, AnchorPosition } from '@/services/api/image-expansion';
import { deleteFromTimeline } from '@/services/api/library';

interface UserViewProps {
  currentUser: User | null;
  addToGenerationHistory: (image: GeneratedImage) => void;
  saveToTimelineOnGeneration: (image: GeneratedImage) => void;
  saveExistingImageToLibrary: (image: GeneratedImage) => void;
  onAddToGoodsHistory: (record: GoodsCreationRecord) => void;
  onUpdateCredits: (newCreditAmount: number) => void;
  menuExePanelFormData: MenuExecutionFormData;
  setMenuExePanelFormData: React.Dispatch<
    React.SetStateAction<MenuExecutionFormData>
  >;
  generatedImages: GeneratedImage[];
  setGeneratedImages: React.Dispatch<React.SetStateAction<GeneratedImage[]>>;
  onToggleImagePublicStatus: (imageId: string, isPublic: boolean) => void;
  onRateImage: (imageId: string, rating: 'good' | 'bad') => void;
  onReloadUserHistory: () => void;
  isLibraryExtending?: boolean; // ライブラリから拡張中かどうか
  actionAfterLoad?: ActionAfterLoadType; // ライブラリからの読み込み処理
  onActionAfterLoadPerformed?: () => void; // 処理完了コールバック
}

const UserView: React.FC<UserViewProps> = ({
  currentUser,
  addToGenerationHistory,
  saveToTimelineOnGeneration,
  saveExistingImageToLibrary,
  onAddToGoodsHistory,
  onUpdateCredits,
  menuExePanelFormData,
  setMenuExePanelFormData,
  generatedImages,
  setGeneratedImages,
  onToggleImagePublicStatus,
  onRateImage,
  onReloadUserHistory,
  isLibraryExtending = false, // デフォルトはfalse
  actionAfterLoad,
  onActionAfterLoadPerformed,
}) => {
  const { showToast } = useToast();

  const menus = useMenus();
  const credits = useCredits();
  const { refreshCredits } = useCreditsActions();

  const [isLoading, setIsLoading] = useState(false);
  
  // 統合されたローディング状態（通常の生成中 または ライブラリからの拡張中）
  const isGenerating = isLoading || isLibraryExtending;
  
  // 拡張モーダル関連のstate
  const [isDirectionModalOpen, setIsDirectionModalOpen] = useState(false);
  const [imageToExpand, setImageToExpand] = useState<GeneratedImage | null>(null);

  const commonGenerationChecks = (cost: number): boolean => {
    if (!currentUser) {
      showToast('error', 'ログインが必要です。');
      return false;
    }
    if (credits < cost) {
      showToast('error', '画像を生成するためのクレジットが不足しています。');
      return false;
    }
    return true;
  };

  const handleGenerateClick = useCallback(
    async (formData: MenuExecutionFormData) => {
      if (!currentUser) {
        showToast('error', 'ログインが必要です。');
        return;
      }

      const selectedMenu = menus?.find((m) => m.id === formData.menu?.id);
      if (!selectedMenu) {
        showToast('error', '生成メニューが見つかりません。');
        return;
      }

      const cost = selectedMenu.credit ?? 0;
      if (credits < cost) {
        showToast('error', 'クレジットが不足しています。');
        return;
      }

      const requestParams = convertFormDataToRequestParams(formData);
      const requiredPromptVariableLength =
        selectedMenu.promptVariables?.length ?? 0;
      const inputPromptVariableLength =
        requestParams.promptVariables?.filter((v) => v.value.trim() !== '')
          .length ?? 0;
      if (inputPromptVariableLength < requiredPromptVariableLength) {
        showToast('error', '追加入力欄が未入力です。');
        return;
      }

      setIsLoading(true);

      const exeResponse = await executeMenu(requestParams, currentUser.id, () =>
        showToast('error', '画像生成に失敗しました。'),
      );
      if (exeResponse) {
        // GeneratedImageに必要情報を格納
        const newImage: GeneratedImage = {
          id: Date.now().toString(),
          url: exeResponse.generatedImageUrl,
          displayPrompt: exeResponse.promptFormatted,
          menuName: selectedMenu.name,
          usedFormData: formData,
          timestamp: exeResponse.createdAt,
          isPublic: false,
          authorName: currentUser?.name || 'ゲスト',
        };
        setGeneratedImages((prev) => [newImage, ...prev]);
        
        // タイムラインに保存（生成履歴として、ライブラリフラグ=false）
        saveToTimelineOnGeneration(newImage);
        
        showToast('success', '画像が正常に生成されました。');

        // クレジット消費API実行
        const reqBody = { 
          credits: cost,
          user_id: currentUser.id 
        };
        const onError = () =>
          showToast('error', 'クレジット消費に失敗しました（画像生成は成功）');
        await consumeCredits(reqBody, onError);
        refreshCredits(currentUser.id);
      }
      setIsLoading(false);
    },
    [currentUser, menus, onUpdateCredits, showToast],
  );

  const applyRegenerateFormDataToMenuExePanel = useCallback(
    async (formData: MenuExecutionFormData, generatedImageUrl?: string) => {
      // メニューが存在する場合はメニューベース、存在しない場合は画像アップロードベースで処理
      const hasValidMenu = formData.menu?.id && menus.some((menu) => menu.id === formData.menu?.id);
      
      if (!hasValidMenu && !generatedImageUrl) {
        showToast(
          'error',
          '再生成に必要な情報が不足しています。メニューが削除されているか、画像が利用できません。',
        );
        return;
      }

      // 生成画像を元に別の画像を生成する場合、URLをファイルに変換
      let generatedImageFile: File | undefined = undefined;
      if (generatedImageUrl) {
        try {
          const response = await fetch(generatedImageUrl);
          const blob = await response.blob();
          const urlParts = generatedImageUrl.split('/');
          const guessedName =
            urlParts[urlParts.length - 1].split('?')[0] ||
            `download_${Date.now()}.png`;
          generatedImageFile = new File([blob], guessedName, {
            type: blob.type,
          });
        } catch (e) {
          showToast(
            'error',
            '生成画像取得に失敗しました。生成画像URLが期限切れの可能性があります。',
          );
          return;
        }
      }

      // メニューが存在しない場合は画像アップロードモードに切り替え
      const modifiedFormData: MenuExecutionFormData = hasValidMenu ? {
        ...formData,
        image: generatedImageFile ?? formData.image,
        inputType: generatedImageFile ? 'upload' : formData.inputType,
      } : {
        // メニューが存在しない場合は現在のカテゴリ/メニューを保持して画像のみ設定
        category: menuExePanelFormData.category,
        menu: menuExePanelFormData.menu,
        image: generatedImageFile,
        additionalPromptForMyCar: formData.additionalPromptForMyCar || '',
        additionalPromptForOthers: formData.additionalPromptForOthers || '',
        aspectRatio: formData.aspectRatio || AspectRatio.Original,
        promptVariables: [],
        inputType: 'upload' as const,
      };

      setMenuExePanelFormData(modifiedFormData);
      showToast('success', hasValidMenu ? '再生成用パラメータをセットしました。' : '画像アップロードモードで再生成用パラメータをセットしました。');
    },
    [menus, menuExePanelFormData], // menuExePanelFormData を依存配列に追加
  );

  // useEffect で actionAfterLoad の処理を追加
  useEffect(() => {
    if (actionAfterLoad && typeof actionAfterLoad === 'object' && actionAfterLoad.type === 'loadFromLibrary') {
      // ライブラリからの画像読み込み処理を実行
      applyRegenerateFormDataToMenuExePanel(actionAfterLoad.formData, actionAfterLoad.generatedImageUrl);
      
      // 処理完了を通知
      if (onActionAfterLoadPerformed) {
        onActionAfterLoadPerformed();
      }
    }
  }, [actionAfterLoad, onActionAfterLoadPerformed, applyRegenerateFormDataToMenuExePanel]);

  // const handleExtendImage = useCallback((image: GeneratedImage) => {
  //   if (!commonGenerationChecks(EXTEND_IMAGE_CREDIT_COST)) return;

  //   const extendOptions: GenerationOptions = {
  //     ...image.fullOptions,
  //     finalPromptForService: `拡張: ${image.displayPrompt}`,
  //     creditCostForService: EXTEND_IMAGE_CREDIT_COST,
  //     uploadedCarImageDataUrl: image.url,
  //     uploadedCarImageFile: undefined,
  //     originalUploadedImageDataUrl: image.fullOptions.originalUploadedImageDataUrl || image.sourceImageUrl,
  //   };
  //   handleGenerateImageInternal(extendOptions, 'extend');

  // }, [currentUser, initialCredits, handleGenerateImageInternal]);
  const handleExtendImage = useCallback((image: GeneratedImage) => {
    if (!currentUser) {
      showToast('error', 'ログインが必要です。');
      return;
    }
    
    // クレジット確認
    if (credits < EXTEND_IMAGE_CREDIT_COST) {
      showToast('error', '画像拡張に必要なクレジットが不足しています。');
      return;
    }
    
    // 拡張する画像を設定してモーダルを開く
    setImageToExpand(image);
    setIsDirectionModalOpen(true);
  }, [currentUser, credits, showToast]);

  const handleDeleteSessionImage = useCallback(async (imageIdToDelete: string) => {
    if (!currentUser?.id) return;
    
    try {
      // データベースからも削除
      const success = await deleteFromTimeline(currentUser.id, imageIdToDelete);
      if (success) {
        // フロントエンドのステートからも削除
    setGeneratedImages((prev) =>
      prev.filter((img) => img.id !== imageIdToDelete),
    );
        
        // ライブラリデータも更新（削除した画像がライブラリにある場合）
        onReloadUserHistory();
        
        showToast('info', '画像を完全に削除しました。');
      } else {
        showToast('error', '画像の削除に失敗しました。');
      }
    } catch (error) {
      console.error('画像削除エラー:', error);
      showToast('error', '画像の削除中にエラーが発生しました。');
    }
  }, [currentUser, onReloadUserHistory, showToast]);

  // 拡張モーダルのコールバック関数
  const handleDirectionModalClose = useCallback(() => {
    setIsDirectionModalOpen(false);
    setImageToExpand(null);
  }, []);

  const handleDirectionModalConfirm = useCallback(async (anchorPosition: AnchorPosition) => {
    if (!imageToExpand || !currentUser) {
      showToast('error', '画像拡張の準備ができていません。');
      return;
    }

    setIsLoading(true);
    
    try {
      // クレジット消費
      const reqBody = { 
        credits: EXTEND_IMAGE_CREDIT_COST,
        user_id: currentUser.id 
      };
      const onError = () =>
        showToast('error', 'クレジット消費に失敗しました（画像拡張は成功）');
      await consumeCredits(reqBody, onError);
      refreshCredits(currentUser.id);
      
      // 画像拡張API呼び出し
      const expandedImage = await expandImage(
        imageToExpand.id,
        anchorPosition,
        currentUser.id,
        imageToExpand, // 元の画像データを送信
        (error) => {
          console.error('画像拡張エラー:', error);
          showToast('error', error instanceof Error ? error.message : '画像拡張に失敗しました');
        }
      );

      if (expandedImage) {
        // 生成画像リストに追加（バックエンドで既にタイムラインに保存済み）
        setGeneratedImages(prev => [expandedImage, ...prev]);
        
        showToast('success', '画像の拡張が完了しました！');
      }
    } catch (error) {
      console.error('画像拡張処理エラー:', error);
      showToast('error', '画像拡張処理中にエラーが発生しました');
    } finally {
      setIsLoading(false);
      handleDirectionModalClose();
    }
  }, [imageToExpand, currentUser, refreshCredits, showToast, setGeneratedImages, addToGenerationHistory, saveToTimelineOnGeneration, handleDirectionModalClose]);

  const handleSaveToLibrary = useCallback(
    (imageToSave: GeneratedImage) => {
      saveExistingImageToLibrary(imageToSave);
      showToast('success', '画像がライブラリに保存されました！');
    },
    [saveExistingImageToLibrary],
  );

  const handleCreateGoodsForImage = useCallback(
    (
      item: SuzuriItem,
      image: GeneratedImage,
      selectedVariations?: Record<string, string>,
    ) => {
      if (!currentUser || !commonGenerationChecks(item.creditCost)) return;

      const newBalance = credits - item.creditCost;
      onUpdateCredits(newBalance);

      const goodsRecord: GoodsCreationRecord = {
        id: `${item.id}-${Date.now()}`,
        goodsName: item.name,
        imageId: image.id,
        imageUrl: image.url,
        prompt: image.displayPrompt,
        timestamp: new Date(),
        creditCost: item.creditCost,
        selectedVariations: selectedVariations, // Save selected variations
      };
      onAddToGoodsHistory(goodsRecord);
      showToast(
        'success',
        `(モック) ${item.name}を作成しました。コスト: ${item.creditCost}クレジット。`,
      );
    },
    [currentUser, credits, onUpdateCredits, onAddToGoodsHistory],
  );

  // グッズ作成成功時のコールバック関数
  const handleGoodsUpdate = (imageId: string) => {
    // グッズ作成成功時にカウンタを+1
    setGeneratedImages(prevImages => {
      const updated = prevImages.map(prevImage => 
        prevImage.id === imageId 
          ? { ...prevImage, goods_creation_count: (prevImage.goods_creation_count || 0) + 1 }
          : prevImage
      );
      
      return updated;
    });
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 h-[calc(100vh-100px)] md:h-[calc(100vh-120px)]">
      <div className="md:w-1/3 lg:w-1/4 xl:w-2/5 h-full">
        <MenuExecutionPanel
          onGenerateClick={handleGenerateClick}
          isGenerating={isGenerating}
          formData={menuExePanelFormData}
          setFormData={setMenuExePanelFormData}
          currentUser={currentUser}
        />
      </div>

      <div className="md:w-2/3 lg:w-3/4 xl:w-3/5 flex flex-col gap-4 h-full">
        <div className="flex-grow min-h-0">
          <GeneratedImagesPanel
            images={generatedImages}
            isLoading={isGenerating}
            currentUser={currentUser}
            applyRegenerateFormDataToMenuExePanel={
              applyRegenerateFormDataToMenuExePanel
            }
            onRegenerate={handleGenerateClick}
            onExtendImage={handleExtendImage}
            onDeleteImage={handleDeleteSessionImage}
            onSaveToLibrary={handleSaveToLibrary}
            onRateImage={onRateImage}
            onCreateGoodsForImage={handleCreateGoodsForImage}
            onToggleImagePublicStatus={onToggleImagePublicStatus}
            onGoodsUpdate={handleGoodsUpdate}
          />
        </div>
      </div>

      {/* 方向選択モーダル */}
      <DirectionSelectionModal
        isOpen={isDirectionModalOpen}
        onClose={handleDirectionModalClose}
        onConfirm={handleDirectionModalConfirm}
        imageName={imageToExpand?.displayPrompt || '画像'}
      />
    </div>
  );
};

export default UserView;
