import React, { useState, useCallback } from 'react';
import { MenuExecutionPanel } from '../components/panels/MenuExecutionPanel';
import { GeneratedImagesPanel } from '../components/panels/GeneratedImagesPanel';
import {
  GeneratedImage,
  SuzuriItem,
  GoodsCreationRecord,
  User,
  ActionAfterLoadType,
  CreditsRequestParams,
  MenuExecutionFormData,
} from '../types';
import { useToast } from '@/contexts/ToastContext';
import { useMenus } from '@/contexts/MenusContext';
import {
  convertFormDataToRequestParams,
  executeMenu,
} from '@/services/api/menu-execution';
import { useCredits, useCreditsActions } from '@/contexts/CreditsContext';
import { consumeCredits } from '@/services/api/credits';

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
}) => {
  const { showToast } = useToast();

  const menus = useMenus();
  const credits = useCredits();
  const { refreshCredits } = useCreditsActions();

  const [isLoading, setIsLoading] = useState(false);

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

      const exeResponse = await executeMenu(requestParams, () =>
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
        const reqBody: CreditsRequestParams = { credits: cost };
        const onError = () =>
          showToast('error', 'クレジット消費に失敗しました（画像生成は成功）');
        await consumeCredits(reqBody, onError);
        refreshCredits();
      }
      setIsLoading(false);
    },
    [currentUser, menus, onUpdateCredits, showToast],
  );

  const applyRegenerateFormDataToMenuExePanel = useCallback(
    async (formData: MenuExecutionFormData, generatedImageUrl?: string) => {
      // メニューが今も存在するかチェック
      if (!menus.some((menu) => menu.id === formData.menu?.id)) {
        showToast(
          'error',
          '生成時のメニュー取得に失敗しました。メニューが削除された可能性があります。',
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

      const modifiedFormData: MenuExecutionFormData = {
        ...formData,
        image: generatedImageFile ?? formData.image,
        inputType: generatedImageFile ? 'upload' : formData.inputType,
      };

      setMenuExePanelFormData(modifiedFormData);
      showToast('success', '再生成用パラメータをセットしました。');
    },
    [],
  );

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
  const handleExtendImage = useCallback((image: GeneratedImage) => {}, []);

  const handleDeleteSessionImage = useCallback((imageIdToDelete: string) => {
    setGeneratedImages((prev) =>
      prev.filter((img) => img.id !== imageIdToDelete),
    );
    showToast('info', 'セッションから画像を削除しました。');
  }, []);

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

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 h-[calc(100vh-100px)] md:h-[calc(100vh-120px)]">
      <div className="md:w-1/3 lg:w-1/4 xl:w-2/5 h-full">
        <MenuExecutionPanel
          onGenerateClick={handleGenerateClick}
          isGenerating={isLoading}
          formData={menuExePanelFormData}
          setFormData={setMenuExePanelFormData}
        />
      </div>

      <div className="md:w-2/3 lg:w-3/4 xl:w-3/5 flex flex-col gap-4 h-full">
        <div className="flex-grow min-h-0">
          <GeneratedImagesPanel
            images={generatedImages}
            isLoading={isLoading}
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
          />
        </div>
      </div>
    </div>
  );
};

export default UserView;
