import React, { useEffect, useState } from 'react';
import { GeneratedImage, GenerationOptions, SuzuriItem, User } from '../types';
import { GOODS_OPTIONS, EXTEND_IMAGE_CREDIT_COST } from '../constants';
import {
  XMarkIcon as CloseIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ShoppingBagIcon,
  ArrowPathIcon,
  ShareIcon,
  SparklesIcon as ExtendIcon,
  ThumbUpIcon,
  ThumbDownIcon,
  EyeSlashIcon, // For public toggle
  EyeIcon as ViewIcon, // For public toggle
} from '@/components/icons/HeroIcons';
import { ShareGeneratedImageModal } from '@/components/modals/ShareGeneratedImageModal';
import { useCredits } from '@/contexts/CreditsContext';

interface LibraryImageDetailViewProps {
  image: GeneratedImage;
  onClose: () => void;
  onLoadOptions: (options: GenerationOptions) => void;
  onRateImage: (imageId: string, rating: 'good' | 'bad') => void;
  onDeleteImage: (imageId: string) => void;
  onCreateGoods: (item: SuzuriItem, image: GeneratedImage) => void;
  onExtendImage: (image: GeneratedImage) => void;
  onTogglePublicStatus: (imageId: string, isPublic: boolean) => void; // Added
  currentUser: User | null;
}

export const LibraryImageDetailView: React.FC<LibraryImageDetailViewProps> = ({
  image,
  onClose,
  onLoadOptions,
  onRateImage,
  onDeleteImage,
  onCreateGoods,
  onExtendImage,
  onTogglePublicStatus, // Added
  currentUser,
}) => {
  const credits = useCredits();

  const [showGoodsModal, setShowGoodsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isCurrentlyPublic, setIsCurrentlyPublic] = useState(image.isPublic);
  const [currentRating, setCurrentRating] = useState<
    'good' | 'bad' | undefined
  >(image.rating);

  useEffect(() => {
    setCurrentRating(image.rating);
  }, [image.rating]);

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
      className={`flex flex-col items-center justify-center p-2 space-y-1 rounded-md bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white transition-all duration-150 ease-in-out text-xs disabled:opacity-50 disabled:hover:bg-gray-700 ${className}`}
    >
      {icon}
      <span className="text-[10px] sm:text-xs">{label}</span>
    </button>
  );

  const handleGenerateWithThisImage = () => {
    const newOptions: GenerationOptions = {
      ...image.fullOptions,
      uploadedCarImageDataUrl: image.url,
      uploadedCarImageFile: undefined,
      originalUploadedImageDataUrl: image.url,
    };
    onLoadOptions(newOptions);
    onClose();
  };

  const handleExtendGeneration = () => {
    onExtendImage(image);
    onClose();
  };

  const handleDeleteFromLibrary = () => {
    if (
      window.confirm(
        'この画像をライブラリから本当に削除しますか？この操作は元に戻せません。',
      )
    ) {
      onDeleteImage(image.id);
      onClose();
    }
  };

  const handleTogglePublic = () => {
    const newPublicStatus = !isCurrentlyPublic;
    setIsCurrentlyPublic(newPublicStatus);
    onTogglePublicStatus(image.id, newPublicStatus);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[70] p-4"
        onClick={onClose}
      >
        <div
          className="bg-gray-850 border border-gray-700 p-4 md:p-6 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col md:flex-row gap-4 md:gap-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 text-gray-500 hover:text-white bg-gray-800/50 hover:bg-gray-700/80 p-1.5 rounded-full z-10"
            aria-label="詳細ビューを閉じる"
          >
            <CloseIcon className="w-6 h-6" />
          </button>

          <div className="md:w-2/3 flex-shrink-0 flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden aspect-video md:aspect-auto md:max-h-[calc(90vh-6rem)]">
            <img
              src={image.url}
              alt={image.displayPrompt || 'Generated library image'}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          <div className="md:w-1/3 flex flex-col space-y-3 overflow-y-auto custom-scrollbar pr-1 pb-1">
            <div>
              <h3 className="text-lg font-semibold text-indigo-300 mb-1">
                {image.menuName || 'カスタム生成'}
              </h3>
              <p className="text-sm text-gray-400 mb-1 leading-tight">
                {image.displayPrompt}
              </p>
              <p className="text-xs text-gray-500">
                保存日: {new Date(image.timestamp).toLocaleString('ja-JP')}
              </p>
            </div>

            <div className="border-t border-gray-700 pt-3 space-y-2">
              <div className="flex items-center justify-start space-x-2">
                <p className="text-sm text-gray-300">評価:</p>
                <button
                  onClick={() => {
                    onRateImage(image.id, 'good');
                    setCurrentRating('good');
                  }}
                  title="良い"
                  className={`p-1.5 rounded-full hover:bg-gray-600 ${
                    currentRating === 'good'
                      ? 'text-green-400 ring-1 ring-green-500'
                      : 'text-gray-500 hover:text-green-300'
                  }`}
                  aria-pressed={currentRating === 'good'}
                >
                  <ThumbUpIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    onRateImage(image.id, 'bad');
                    setCurrentRating('bad');
                  }}
                  title="悪い"
                  className={`p-1.5 rounded-full hover:bg-gray-600 ${
                    currentRating === 'bad'
                      ? 'text-red-400 ring-1 ring-red-500'
                      : 'text-gray-500 hover:text-red-300'
                  }`}
                  aria-pressed={currentRating === 'bad'}
                >
                  <ThumbDownIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <ActionButton
                onClick={handleGenerateWithThisImage}
                icon={<ArrowPathIcon className="w-5 h-5" />}
                label="この画像で生成"
                title="この画像と設定を再利用"
              />
              <ActionButton
                onClick={handleExtendGeneration}
                icon={<ExtendIcon className="w-5 h-5" />}
                label="生成拡張"
                title={`画像を拡張 (コスト: ${EXTEND_IMAGE_CREDIT_COST}C)`}
                disabled={credits < EXTEND_IMAGE_CREDIT_COST}
              />
              <ActionButton
                onClick={handleDownloadImage}
                icon={<ArrowDownTrayIcon className="w-5 h-5" />}
                label="DL"
                title="画像をダウンロード"
              />
            </div>

            <div className="border-t border-gray-700 mt-2 pt-2 grid grid-cols-3 gap-2">
              <ActionButton
                onClick={() => setShowShareModal(true)}
                icon={<ShareIcon className="w-5 h-5" />}
                label="シェア"
              />
              <ActionButton
                onClick={() => setShowGoodsModal(true)}
                icon={<ShoppingBagIcon className="w-5 h-5" />}
                label="グッズ"
              />
              <ActionButton
                onClick={handleDeleteFromLibrary}
                icon={
                  <TrashIcon className="w-5 h-5 text-red-400/80 group-hover:text-red-400" />
                }
                label="削除"
                className="hover:bg-red-700/30 group"
              />
            </div>
            <div className="border-t border-gray-700 mt-2 pt-3">
              <button
                onClick={handleTogglePublic}
                title={isCurrentlyPublic ? '非公開にする' : '公開する'}
                className={`w-full flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                  isCurrentlyPublic
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                }`}
              >
                {isCurrentlyPublic ? (
                  <ViewIcon className="w-5 h-5 mr-2" />
                ) : (
                  <EyeSlashIcon className="w-5 h-5 mr-2" />
                )}
                {isCurrentlyPublic ? '公開中' : '非公開にする'}
              </button>
            </div>
          </div>
        </div>

        {showGoodsModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[80] p-4"
            onClick={(e) => {
              e.stopPropagation();
              setShowGoodsModal(false);
            }}
          >
            <div
              className="bg-gray-850 border-gray-700 p-6 rounded-lg shadow-xl w-full max-w-sm relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowGoodsModal(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
              >
                <CloseIcon className="w-6 h-6" />
              </button>
              <h3 className="text-xl font-semibold text-indigo-400 mb-4">
                グッズ作成
              </h3>
              <p className="text-sm text-gray-400 mb-1">
                画像:{' '}
                <span className="italic truncate">
                  {image.menuName} - {image.displayPrompt.substring(0, 20)}...
                </span>
              </p>
              <p className="text-sm text-gray-400 mb-4">
                作成するアイテムを選択 (クレジット消費):
              </p>
              <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                {GOODS_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (credits < item.creditCost) {
                        alert(
                          `${item.name}を作成するためのクレジットが不足しています。`,
                        );
                        return;
                      }
                      onCreateGoods(item, image);
                      setShowGoodsModal(false);
                    }}
                    disabled={credits < item.creditCost}
                    className="w-full flex justify-between items-center p-3 bg-gray-700 hover:bg-indigo-600 rounded-md transition-colors disabled:opacity-60 disabled:hover:bg-gray-700"
                  >
                    <span>{item.name}</span>
                    <span
                      className={`text-xs ${credits < item.creditCost ? 'text-red-400' : 'text-indigo-300'}`}
                    >
                      {item.creditCost} クレジット
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {showShareModal && (
        <ShareGeneratedImageModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          image={image}
          currentUser={currentUser}
        />
      )}
    </>
  );
};
