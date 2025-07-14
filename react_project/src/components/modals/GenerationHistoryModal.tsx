import React, { useState } from 'react';
import { GeneratedImage, MenuExecutionFormData, SuzuriItem, User } from '@/types';
import { XMarkIcon, PhotoIcon, EyeIcon } from '@/components/icons/HeroIcons';
import { LibraryImageDetailView } from '@/views/LibraryImageDetailView';

interface GenerationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: GeneratedImage[];
  onLoadOptions: (formData: MenuExecutionFormData, generatedImageUrl?: string) => void;
  onRateImageInLibrary: (imageId: string, rating: 'good' | 'bad') => void;
  onDeleteFromLibrary: (imageId: string) => void;
  onCreateGoodsForLibrary: (item: SuzuriItem, image: GeneratedImage) => void;
  onExtendImageFromLibrary: (image: GeneratedImage) => void;
  onToggleLibraryImagePublicStatus: (
    imageId: string,
    isPublic: boolean,
  ) => void; // Added
  currentUser: User | null;
}

export const GenerationHistoryModal: React.FC<GenerationHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onLoadOptions,
  onRateImageInLibrary,
  onDeleteFromLibrary,
  onCreateGoodsForLibrary,
  onExtendImageFromLibrary,
  onToggleLibraryImagePublicStatus, // Added
  currentUser,
}) => {
  const [selectedImageDetail, setSelectedImageDetail] =
    useState<GeneratedImage | null>(null);

  if (!isOpen) return null;

  // ライブラリ保存済みの画像のみをフィルター
  const libraryImages = history.filter(image => image.isSavedToLibrary === true);

  const handleImageClick = (image: GeneratedImage) => {
    setSelectedImageDetail(image);
  };

  const handleCloseDetailView = () => {
    setSelectedImageDetail(null);
  };

  const handleLoadOptionsAndCloseAll = (formData: MenuExecutionFormData, generatedImageUrl?: string) => {
    onLoadOptions(formData, generatedImageUrl);
    onClose();
    handleCloseDetailView();
  };

  const handleExtendAndCloseAll = (image: GeneratedImage) => {
    onExtendImageFromLibrary(image);
    // 詳細ビューは開いたまま、拡張方向選択モーダルを表示
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-indigo-400">
              ライブラリ
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700"
            >
              <XMarkIcon className="w-7 h-7" />
            </button>
          </div>
          {libraryImages.length === 0 ? (
            <div className="flex-grow flex flex-col items-center justify-center text-gray-500">
              <PhotoIcon className="w-20 h-20 mb-4" />
              <p className="text-xl">ライブラリはまだ空です。</p>
              <p className="text-md">
                画像を生成後、「ライブラリへ保存」するとここに追加されます。
              </p>
            </div>
          ) : (
            <ul className="space-y-3 overflow-y-auto flex-grow custom-scrollbar pr-2">
              {libraryImages.map((image) => (
                <li
                  key={image.id}
                  className="bg-gray-700 p-3 rounded-lg shadow hover:bg-gray-600 transition-colors duration-150 flex items-center space-x-4 cursor-pointer"
                  onClick={() => handleImageClick(image)}
                  title="詳細を表示して操作"
                >
                  <img
                    src={image.url}
                    alt={image.displayPrompt.substring(0, 50)}
                    className="w-24 h-24 object-cover rounded-md border border-gray-500"
                  />
                  <div className="flex-grow min-w-0">
                    <p
                      className="text-sm font-semibold text-indigo-300 truncate"
                      title={image.displayPrompt}
                    >
                      {image.menuName
                        ? `メニュー: ${image.menuName}`
                        : 'カスタム生成'}
                      {image.isPublic && (
                        <span className="ml-2 text-xs text-green-400 bg-green-700/50 px-1.5 py-0.5 rounded-full">
                          公開中
                        </span>
                      )}
                    </p>
                    <p
                      className="text-xs text-gray-400 truncate"
                      title={image.displayPrompt}
                    >
                      詳細: {image.displayPrompt || '情報なし'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      日時:{' '}
                      {new Date(image.timestamp).toLocaleDateString('ja-JP', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {image.rating && (
                      <p className="text-xs mt-1">
                        評価:{' '}
                        <span
                          className={`font-semibold ${image.rating === 'good' ? 'text-green-400' : 'text-red-400'}`}
                        >
                          {image.rating === 'good' ? '良い' : '悪い'}
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleImageClick(image);
                    }}
                    className="p-2 text-gray-400 hover:text-indigo-300"
                    title="詳細表示 & 操作"
                  >
                    <EyeIcon className="w-6 h-6" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {selectedImageDetail && (
        <LibraryImageDetailView
          image={selectedImageDetail}
          onClose={handleCloseDetailView}
          onLoadOptions={handleLoadOptionsAndCloseAll}
          onRateImage={onRateImageInLibrary}
          onDeleteImage={onDeleteFromLibrary}
          onCreateGoods={onCreateGoodsForLibrary}
          onExtendImage={handleExtendAndCloseAll}
          onTogglePublicStatus={onToggleLibraryImagePublicStatus} // Pass handler
          currentUser={currentUser}
        />
      )}
    </>
  );
};
