import React, { useState } from 'react';
import {
  GeneratedImage,
  MenuExecutionFormData,
  SuzuriItem,
  User,
} from '@/types';
import { GOODS_OPTIONS, EXTEND_IMAGE_CREDIT_COST } from '@/constants';
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  TrashIcon,
  ShoppingBagIcon,
  XMarkIcon as CloseIconMini,
  PhotoIcon,
  BookmarkIcon,
  ShareIcon,
  SparklesIcon as ExtendIcon,
  ThumbUpIcon,
  ThumbDownIcon,
  CalendarDaysIcon,
  EyeSlashIcon,
  EyeIcon as ViewIcon,
} from '../icons/HeroIcons';
import { ShareGeneratedImageModal } from '../modals/ShareGeneratedImageModal';
import { SuzuriMerchandiseModal } from '../modals/SuzuriMerchandiseModal';
import { useCredits } from '@/contexts/CreditsContext';
import { suzuriApiClient } from '@/services/suzuriApi';

interface GeneratedImagePanelProps {
  image: GeneratedImage;
  currentUser: User | null;
  applyRegenerateFormDataToMenuExePanel: (
    formData: MenuExecutionFormData,
    generatedImageUrl?: string,
  ) => void;
  onRegenerate: (params: MenuExecutionFormData) => void;
  onExtendImage: (image: GeneratedImage) => void;
  onDelete: (imageId: string) => void;
  onSaveToLibrary: (image: GeneratedImage) => void;
  onRate: (imageId: string, rating: 'good' | 'bad') => void;
  onCreateGoods: (
    item: SuzuriItem,
    image: GeneratedImage,
    selectedVariations?: Record<string, string>,
  ) => void;
  onTogglePublic: (imageId: string, isPublic: boolean) => void;
  onGoodsUpdate: (imageId: string) => void; // グッズ作成成功時のコールバック
}

export const GeneratedImagePanel: React.FC<GeneratedImagePanelProps> = ({
  image,
  currentUser,
  applyRegenerateFormDataToMenuExePanel,
  onRegenerate,
  onExtendImage,
  onDelete,
  onSaveToLibrary,
  onRate,
  onCreateGoods,
  onTogglePublic,
  onGoodsUpdate,
}) => {
  const credits = useCredits();

  const [selectedGoodsItemForModal, setSelectedGoodsItemForModal] =
    useState<SuzuriItem | null>(null);
  const [selectedVariations, setSelectedVariations] = useState<
    Record<string, string>
  >({});
  const [showShareModal, setShowShareModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showSuzuriModal, setShowSuzuriModal] = useState(false);
  const [showGoodsModal, setShowGoodsModal] = useState(false);
  const [merchandiseResult, setMerchandiseResult] = useState<any>(null);
  const [isCreatingMerchandise, setIsCreatingMerchandise] = useState(false);

  const handleDownloadImage = async () => {
    try {
      // 外部URLの場合はfetchしてBlobとして取得
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      
      // ファイル名を生成
      const extension = blob.type.includes('png') ? 'png' 
                      : blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg'
                      : blob.type.includes('webp') ? 'webp'
                      : 'jpg';
      
      link.download = `aisha_image_${image.id || Date.now()}.${extension}`;
      
      // ダウンロードを実行
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Blobの解放
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download failed:', error);
      
      // フォールバック: 新しいタブで画像を開く
      const link = document.createElement('a');
      link.href = image.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // ユーザーに通知
      alert('直接ダウンロードに失敗しました。新しいタブで画像を開きました。右クリックで「名前を付けて画像を保存」を選択してください。');
    }
  };

  // 元画像がローカルキャッシュに存在するかチェック
  const hasOriginalImageCache = () => {
    // Fileオブジェクトとして元画像が存在するかチェック
    return image.usedFormData?.image instanceof File;
  };

  // 再生成が可能かチェック（元画像のキャッシュまたは生成画像の利用可能性）
  const canRegenerate = () => {
    // 元画像のキャッシュがある場合は確実に再生成可能
    if (hasOriginalImageCache()) {
      return true;
    }
    
    // 元画像のキャッシュがない場合でも、生成画像を使った再生成は可能
    return !!image.url;
  };

  // 再生成
  const handleSetParamsWithInputImage = () => {
    applyRegenerateFormDataToMenuExePanel(image.usedFormData);
  };

  const handleSetParamsWithGeneratedImage = () => {
    applyRegenerateFormDataToMenuExePanel(image.usedFormData, image.url);
  };

  const openGoodsModal = () => {
    setShowSuzuriModal(true);
  };

  const handleSelectVariation = (variationId: string, option: string) => {
    setSelectedVariations((prev) => ({ ...prev, [variationId]: option }));
  };

  // SUZURI グッズ作成関数
  const handleCreateSuzuriMerchandise = async () => {
    setIsCreatingMerchandise(true);
    try {
      const response = await suzuriApiClient.createMerchandise({
        image_url: image.url,
        car_name: image.displayPrompt || 'AI生成画像',
        description: `AI生成された画像から作成されたTシャツです。\n\n生成プロンプト: ${image.displayPrompt}`,
        item_type: 'heavyweight-t-shirt',
      });
      setMerchandiseResult(response);
    } catch (error: any) {
      console.error('SUZURI merchandise creation failed:', error);
      setMerchandiseResult({
        success: false,
        error: error.message || 'グッズ作成中にエラーが発生しました',
      });
    } finally {
      setIsCreatingMerchandise(false);
    }
  };

  const handleCreateSuzuriMerchandiseWithItem = async (itemType: string, itemName: string) => {
    setIsCreatingMerchandise(true);
    try {
      const response = await suzuriApiClient.createMerchandise({
        image_url: image.url,
        car_name: image.displayPrompt || 'AI生成画像',
        description: `AI生成された画像から作成された${itemName}です。\n\n生成プロンプト: ${image.displayPrompt}`,
        item_type: itemType,
      });
      setMerchandiseResult(response);
    } catch (error: any) {
      console.error('SUZURI merchandise creation failed:', error);
      setMerchandiseResult({
        success: false,
        error: error.message || 'グッズ作成中にエラーが発生しました',
      });
    } finally {
      setIsCreatingMerchandise(false);
    }
  };


  const handleCreateGoodsClick = (item: SuzuriItem) => {
    if (item.variations && item.variations.length > 0) {
      for (const variation of item.variations) {
        if (!selectedVariations[variation.id]) {
          alert(`${variation.typeName}を選択してください。`);
          return;
        }
      }
    }
    
    // 従来のモック機能
    onCreateGoods(item, image, selectedVariations);
    setSelectedGoodsItemForModal(null);
    setSelectedVariations({});
  };

  const ActionButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    title?: string;
    className?: string;
    disabled?: boolean;
  }> = ({ onClick, icon, label, title, className, disabled }) => (
    <button
      onClick={onClick}
      title={title || label}
      disabled={disabled}
      className={`flex flex-col items-center justify-center p-1.5 sm:p-2 space-y-0.5 rounded-md bg-gray-700/80 hover:bg-indigo-600 text-gray-300 hover:text-white transition-all duration-150 ease-in-out text-xs disabled:opacity-50 disabled:hover:bg-gray-700/80 disabled:cursor-not-allowed ${className || ''}`}
    >
      {icon}
      <span className="text-[9px] sm:text-[10px] leading-tight pt-0.5">
        {label}
      </span>
    </button>
  );

  return (
    <div className="bg-gray-800/80 rounded-lg shadow-xl p-3 md:p-4 flex flex-col">
      <div className="flex-grow flex items-center justify-center mb-3 overflow-hidden rounded-md bg-gray-900/50 aspect-video">
        <img
          src={image.url}
          alt={image.menuName || 'AI画像生成'}
          className="max-w-full max-h-full object-contain rounded-md shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setShowImageModal(true)}
          title="クリックして拡大表示"
        />
      </div>

      <div className="space-y-2.5">

        <div className="flex items-center justify-between px-1 mt-1.5">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-indigo-300">
              メニュー: {image.menuName || 'カスタム'}
            </span>
            <button
              onClick={() => onRate(image.id, 'good')}
              title="良い"
              className={`p-1 rounded-full hover:bg-gray-600 ${image.rating === 'good' ? 'text-green-400 ring-1 ring-green-500' : 'text-gray-500 hover:text-green-300'}`}
              aria-pressed={image.rating === 'good'}
            >
              <ThumbUpIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onRate(image.id, 'bad')}
              title="悪い"
              className={`p-1 rounded-full hover:bg-gray-600 ${image.rating === 'bad' ? 'text-red-400 ring-1 ring-red-500' : 'text-gray-500 hover:text-red-300'}`}
              aria-pressed={image.rating === 'bad'}
            >
              <ThumbDownIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center space-x-2 ml-auto">
            <div className="flex items-center text-xs text-gray-500">
              <CalendarDaysIcon className="w-3.5 h-3.5 mr-1.5" />
              <span>
                {new Date(image.timestamp).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <button
              onClick={() => onTogglePublic(image.id, !image.isPublic)}
              title={image.isPublic ? '非公開にする' : '公開する'}
              className={`flex items-center px-2 py-1 rounded-md text-xs transition-colors duration-150 ${
                image.isPublic
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
              }`}
            >
              {image.isPublic ? (
                <ViewIcon className="w-4 h-4 mr-1" />
              ) : (
                <EyeSlashIcon className="w-4 h-4 mr-1" />
              )}
              {image.isPublic ? '公開中' : '非公開'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <ActionButton
            onClick={handleSetParamsWithInputImage}
            icon={<ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="再生成"
            title={
              hasOriginalImageCache()
                ? "この画像生成時の設定と元画像を再利用して生成パネルへセット"
                : "元画像が利用できません（ローカルキャッシュなし）"
            }
            disabled={!hasOriginalImageCache()}
          />
          <ActionButton
            onClick={handleSetParamsWithGeneratedImage}
            icon={<ArrowPathIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="生成画像で生成"
            title="この生成画像と設定を再利用して生成パネルへセット"
          />
          <ActionButton
            onClick={() => onExtendImage(image)}
            icon={<ExtendIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
            label={`拡張 (${EXTEND_IMAGE_CREDIT_COST}C)`}
            title={`画像を拡張 (コスト: ${EXTEND_IMAGE_CREDIT_COST} クレジット)`}
          />
          <ActionButton
            onClick={() => onSaveToLibrary(image)}
            icon={<BookmarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
            label="ライブラリ保存"
            title="ライブラリへ保存"
          />
        </div>

        <div className="border-t border-gray-700/50 pt-2.5">
          <div className="grid grid-cols-4 gap-1.5">
            <ActionButton
              onClick={handleDownloadImage}
              icon={<ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
              label="DL"
              title="画像をダウンロード"
            />
            <ActionButton
              onClick={() => setShowShareModal(true)}
              icon={<ShareIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
              label="シェア"
            />
            <ActionButton
              onClick={openGoodsModal}
              icon={<ShoppingBagIcon className="w-4 h-4 sm:w-5 sm:h-5" />}
              label="グッズ"
            />
            <ActionButton
              onClick={() => onDelete(image.id)}
              icon={
                <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5 text-red-400/80 hover:text-red-400" />
              }
              label="削除"
            />
          </div>
        </div>
      </div>

      {/* SUZURI グッズ作成モーダル */}
      <SuzuriMerchandiseModal
        isOpen={showSuzuriModal}
        onClose={() => setShowSuzuriModal(false)}
        image={image}
        currentUser={currentUser}
        onGoodsCreated={() => {
          console.log('🔄 GeneratedImagePanel - グッズ作成成功:', image.id);
          onGoodsUpdate(image.id);
        }}
      />

      {/* グッズ作成モーダル（従来のモック機能）*/}
      {showGoodsModal && selectedGoodsItemForModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowGoodsModal(false);
            setSelectedGoodsItemForModal(null);
            setSelectedVariations({});
          }}
        >
          <div
            className="bg-gray-800 border border-gray-700 rounded-3xl p-6 w-full max-w-lg relative flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setShowGoodsModal(false);
                setSelectedGoodsItemForModal(null);
                setSelectedVariations({});
              }}
              className="absolute top-3 right-3 text-gray-400 hover:text-white"
            >
              <CloseIconMini className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-semibold text-indigo-400 mb-4 flex-shrink-0">
              グッズ作成
            </h3>

            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
              {/* SUZURI グッズ作成セクション */}
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg border border-purple-500/30">
                <h4 className="text-lg font-semibold text-purple-300 mb-2 flex items-center">
                  <ShoppingBagIcon className="w-5 h-5 mr-2" />
                  SUZURI でリアルグッズ作成
                </h4>
                <p className="text-sm text-gray-300 mb-3">
                  この画像からTシャツなどの実物グッズを作成できます
                </p>
                
                {merchandiseResult ? (
                  <div className={`p-3 rounded-md ${
                    merchandiseResult.success 
                      ? 'bg-green-900/30 border border-green-500/30' 
                      : 'bg-red-900/30 border border-red-500/30'
                  }`}>
                    {merchandiseResult.success ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">🎉</span>
                          <p className="text-green-300 font-medium">グッズ作成完了！</p>
                        </div>
                        
                        {/* プレビュー画像表示 */}
                        {merchandiseResult.sample_image_url && (
                          <div className="flex justify-center mb-3">
                            <div className="relative group">
                              <img
                                src={merchandiseResult.sample_image_url}
                                alt="作成されたグッズのプレビュー"
                                className="max-w-[200px] h-auto rounded-md border border-gray-600 shadow-lg group-hover:shadow-xl transition-shadow cursor-pointer"
                                onClick={() => {
                                  // 画像拡大モーダル
                                  const modal = document.createElement('div');
                                  modal.className = 'fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[80] p-4';
                                  modal.onclick = () => document.body.removeChild(modal);
                                  
                                  const img = document.createElement('img');
                                  img.src = merchandiseResult.sample_image_url!;
                                  img.className = 'max-w-[90vw] max-h-[90vh] object-contain';
                                  img.onclick = (e) => e.stopPropagation();
                                  
                                  modal.appendChild(img);
                                  document.body.appendChild(modal);
                                }}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all rounded-md flex items-center justify-center">
                                <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity bg-black bg-opacity-50 px-2 py-1 rounded">
                                  クリックで拡大
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex flex-col gap-2">
                          <a
                            href={merchandiseResult.product_url || merchandiseResult.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm rounded-md transition-colors"
                          >
                            🛒 SUZURIで購入する
                          </a>
                          
                          {/* 商品情報の詳細表示 */}
                          {(merchandiseResult.product_title || merchandiseResult.item_name) && (
                            <div className="mt-2 p-2 bg-gray-800/50 rounded text-xs text-gray-300">
                              {merchandiseResult.product_title && (
                                <p><strong>商品名:</strong> {merchandiseResult.product_title}</p>
                              )}
                              {merchandiseResult.item_name && (
                                <p><strong>アイテム:</strong> {merchandiseResult.item_name}</p>
                              )}
                              {merchandiseResult.product_id && (
                                <p><strong>商品ID:</strong> {merchandiseResult.product_id}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-300">❌ {merchandiseResult.error}</p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleCreateSuzuriMerchandise}
                    disabled={isCreatingMerchandise}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium rounded-md transition-colors flex items-center justify-center"
                  >
                    {isCreatingMerchandise ? (
                      <>
                        <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                        作成中...
                      </>
                    ) : (
                      <>
                        <ShoppingBagIcon className="w-4 h-4 mr-2" />
                        Tシャツを作成
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* 従来のモック機能セクション */}
              {!selectedGoodsItemForModal ? (
                <>
                  <div className="border-t border-gray-600 pt-4">
                    <p className="text-sm text-gray-400 mb-1 flex-shrink-0">
                      画像:{' '}
                      <span className="italic truncate">
                        {image.displayPrompt.substring(0, 30)}...
                      </span>
                    </p>
                    <p className="text-sm text-gray-400 mb-4">
                      モック機能 - 作成するアイテムを選択 (クレジット消費):
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {GOODS_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedGoodsItemForModal(item);
                          const initialSelected: Record<string, string> = {};
                          if (item.variations) {
                            item.variations.forEach((v) => {
                              if (v.options.length > 0)
                                initialSelected[v.id] = v.options[0];
                            });
                          }
                          setSelectedVariations(initialSelected);
                        }}
                        className="flex flex-col items-center p-3 bg-gray-700 hover:bg-indigo-700 rounded-md transition-colors text-center shadow-md"
                      >
                        <div className="w-full aspect-square bg-gray-600 rounded mb-2 flex items-center justify-center overflow-hidden">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <PhotoIcon className="w-12 h-12 text-gray-500" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-gray-200 mt-1">
                          {item.name}
                        </span>
                        <span className="text-xs text-indigo-300 mt-0.5">
                          {item.creditCost} クレジット
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-4">
                    {' '}
                    {/* Container for image and text info */}
                    {selectedGoodsItemForModal.imageUrl ? (
                      <div className="w-full aspect-video bg-gray-700/50 rounded-md flex items-center justify-center overflow-hidden my-3">
                        <img
                          src={selectedGoodsItemForModal.imageUrl}
                          alt={selectedGoodsItemForModal.name}
                          className="max-h-48 w-auto object-contain" /* Adjusted image size */
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-gray-700/50 rounded-md flex items-center justify-center text-gray-500 my-3">
                        <PhotoIcon className="w-20 h-20" />{' '}
                        {/* Larger placeholder icon */}
                      </div>
                    )}
                    <div className="text-center">
                      {' '}
                      {/* Centered text info below image */}
                      <p className="text-lg font-semibold text-indigo-300">
                        {selectedGoodsItemForModal.name}
                      </p>
                      <p className="text-sm text-gray-400">
                        {selectedGoodsItemForModal.creditCost} クレジット
                      </p>
                    </div>
                  </div>

                  {selectedGoodsItemForModal.variations &&
                    selectedGoodsItemForModal.variations.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {selectedGoodsItemForModal.variations.map(
                          (variation) => (
                            <div key={variation.id}>
                              <label
                                htmlFor={`variation-${variation.id}`}
                                className="block text-xs font-medium text-gray-300 mb-1"
                              >
                                {variation.typeName}
                              </label>
                              <select
                                id={`variation-${variation.id}`}
                                value={selectedVariations[variation.id] || ''}
                                onChange={(e) =>
                                  handleSelectVariation(
                                    variation.id,
                                    e.target.value,
                                  )
                                }
                                className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-gray-200 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                              >
                                <option value="" disabled>
                                  {variation.typeName}を選択...
                                </option>
                                {variation.options.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ),
                        )}
                      </div>
                    )}
                  <button
                    onClick={() =>
                      handleCreateGoodsClick(selectedGoodsItemForModal)
                    }
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition mt-2"
                    disabled={
                      selectedGoodsItemForModal.variations?.some(
                        (v) => !selectedVariations[v.id],
                      ) || credits < selectedGoodsItemForModal.creditCost
                    }
                  >
                    {credits < selectedGoodsItemForModal.creditCost
                      ? `クレジット不足 (${selectedGoodsItemForModal.creditCost}必要)`
                      : selectedGoodsItemForModal.variations?.some(
                            (v) => !selectedVariations[v.id],
                          )
                        ? 'バリエーションを選択'
                        : `${selectedGoodsItemForModal.name}を作成 (${selectedGoodsItemForModal.creditCost}C)`}
                  </button>
                  <button
                    onClick={() => setSelectedGoodsItemForModal(null)}
                    className="mt-2 w-full text-sm text-gray-400 hover:text-indigo-300"
                  >
                    アイテム選択に戻る
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {showShareModal && (
        <ShareGeneratedImageModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          image={image}
          currentUser={currentUser}
        />
      )}
      
      {/* 画像拡大モーダル */}
      {showImageModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[80] p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70 p-2 rounded-full z-10 transition-colors"
              aria-label="拡大表示を閉じる"
            >
              <CloseIconMini className="w-6 h-6" />
            </button>
            <img
              src={image.url}
              alt={image.menuName || 'AI画像生成'}
              className="max-w-full max-h-full object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-3 rounded-lg">
              <p className="text-sm font-medium">{image.menuName || 'カスタム生成'}</p>
              {/* <p className="text-xs text-gray-300 mt-1">{image.displayPrompt}</p> */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
