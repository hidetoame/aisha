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
import { useCredits } from '@/contexts/CreditsContext';

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
}

export const GeneratedImagePanel: React.FC<GeneratedImagePanelProps> = ({
  image,
  currentUser,
  applyRegenerateFormDataToMenuExePanel,
  onExtendImage,
  onDelete,
  onSaveToLibrary,
  onRate,
  onCreateGoods,
  onTogglePublic,
}) => {
  const credits = useCredits();

  const [showGoodsModal, setShowGoodsModal] = useState(false);
  const [selectedGoodsItemForModal, setSelectedGoodsItemForModal] =
    useState<SuzuriItem | null>(null);
  const [selectedVariations, setSelectedVariations] = useState<
    Record<string, string>
  >({});
  const [showShareModal, setShowShareModal] = useState(false);

  const handleDownloadImage = () => {
    const link = document.createElement('a');
    link.href = image.url;
    const extension = image.url.startsWith('data:image/')
      ? image.url.substring(image.url.indexOf('/') + 1, image.url.indexOf(';'))
      : 'jpg';
    link.download = `aisha_library_image_${image.id || Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 再生成
  const handleSetParamsWithInputImage = () => {
    applyRegenerateFormDataToMenuExePanel(image.usedFormData);
  };

  const handleSetParamsWithGeneratedImage = () => {
    applyRegenerateFormDataToMenuExePanel(image.usedFormData, image.url);
  };

  const openGoodsModal = () => {
    setShowGoodsModal(true);
  };

  const handleSelectVariation = (variationId: string, option: string) => {
    setSelectedVariations((prev) => ({ ...prev, [variationId]: option }));
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
    onCreateGoods(item, image, selectedVariations);
    setShowGoodsModal(false);
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
      className={`flex flex-col items-center justify-center p-1.5 sm:p-2 space-y-0.5 rounded-md bg-gray-700/80 hover:bg-indigo-600 text-gray-300 hover:text-white transition-all duration-150 ease-in-out text-xs disabled:opacity-50 disabled:hover:bg-gray-700 ${className}`}
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
          alt={image.displayPrompt}
          className="max-w-full max-h-full object-contain rounded-md shadow-lg"
        />
      </div>

      <div className="space-y-2.5">
        {image.menuName && (
          <p className="text-xs font-semibold text-indigo-300 px-1">
            メニュー: {image.menuName}
          </p>
        )}
        <p
          className="text-xs text-gray-400 italic truncate px-1"
          title={image.displayPrompt}
        >
          詳細: {image.displayPrompt || 'カスタムプロンプトなし'}
        </p>

        <div className="flex items-center justify-between px-1 mt-1.5">
          <div className="flex items-center space-x-1">
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
            title="この画像生成時の設定と元画像（あれば）を再利用して生成パネルへセット"
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

      {showGoodsModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4"
          onClick={() => {
            setShowGoodsModal(false);
            setSelectedGoodsItemForModal(null);
            setSelectedVariations({});
          }}
        >
          <div
            className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg relative flex flex-col max-h-[80vh]"
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
              グッズ作成 (モック)
            </h3>

            <div className="flex-grow overflow-y-auto custom-scrollbar pr-1">
              {!selectedGoodsItemForModal ? (
                <>
                  <p className="text-sm text-gray-400 mb-1 flex-shrink-0">
                    画像:{' '}
                    <span className="italic truncate">
                      {image.displayPrompt.substring(0, 30)}...
                    </span>
                  </p>
                  <p className="text-sm text-gray-400 mb-4">
                    作成するアイテムを選択 (クレジット消費):
                  </p>
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
    </div>
  );
};
