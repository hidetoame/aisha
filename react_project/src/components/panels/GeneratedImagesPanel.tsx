import React, { useEffect, useRef } from 'react';
import {
  GeneratedImage,
  MenuExecutionFormData,
  SuzuriItem,
  User,
} from '../../types';
import { PhotoIcon } from '../icons/HeroIcons';
import { GeneratedImagePanel } from './GeneratedImagePanel';

interface GeneratedImagesPanelProps {
  images: GeneratedImage[];
  isLoading: boolean;
  currentUser: User | null;
  applyRegenerateFormDataToMenuExePanel: (
    formData: MenuExecutionFormData,
    generatedImageUrl?: string,
  ) => void;
  onRegenerate: (params: MenuExecutionFormData) => void;
  onExtendImage: (image: GeneratedImage) => void;
  onDeleteImage: (imageId: string) => void;
  onSaveToLibrary: (image: GeneratedImage) => void;
  onRateImage: (imageId: string, rating: 'good' | 'bad') => void;
  onCreateGoodsForImage: (
    item: SuzuriItem,
    image: GeneratedImage,
    selectedVariations?: Record<string, string>,
  ) => void;
  onToggleImagePublicStatus: (imageId: string, isPublic: boolean) => void;
}

export const GeneratedImagesPanel: React.FC<GeneratedImagesPanelProps> = ({
  images,
  isLoading,
  currentUser,
  applyRegenerateFormDataToMenuExePanel,
  onRegenerate,
  onExtendImage,
  onDeleteImage,
  onSaveToLibrary,
  onRateImage,
  onCreateGoodsForImage,
  onToggleImagePublicStatus,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevFirstImageIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (scrollContainerRef.current && images.length > 0) {
      const currentFirstImageId = images[0].id;
      if (currentFirstImageId !== prevFirstImageIdRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      prevFirstImageIdRef.current = currentFirstImageId;
    } else if (images.length === 0) {
      prevFirstImageIdRef.current = undefined;
    }
  }, [images]);

  if (isLoading && images.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-xl p-6 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
        <p className="text-xl font-semibold text-indigo-300">傑作を生成中...</p>
        <p className="text-gray-400">少々お待ちください。</p>
      </div>
    );
  }

  if (!isLoading && images.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-xl p-6 text-center">
        <PhotoIcon className="w-24 h-24 text-gray-600 mb-4" />
        <p className="text-xl font-semibold text-gray-500">
          生成された画像はここに表示されます。
        </p>
        <p className="text-gray-400">
          左側でオプションを設定し、「生成」をクリックしてください。
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollContainerRef}
      className="h-full overflow-y-auto space-y-4 pr-2 custom-scrollbar"
    >
      {isLoading && images.length > 0 && (
        <div className="sticky top-0 z-10 bg-gray-800/80 backdrop-blur-sm p-3 rounded-b-lg shadow-lg flex items-center justify-center text-sm text-indigo-300">
          <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-400 mr-2"></div>
          新しい画像を生成中...
        </div>
      )}
      {images.map((img) => (
        <GeneratedImagePanel
          key={img.id}
          image={img}
          currentUser={currentUser}
          applyRegenerateFormDataToMenuExePanel={
            applyRegenerateFormDataToMenuExePanel
          }
          onRegenerate={onRegenerate}
          onExtendImage={onExtendImage}
          onDelete={onDeleteImage}
          onSaveToLibrary={onSaveToLibrary}
          onRate={onRateImage}
          onCreateGoods={onCreateGoodsForImage}
          onTogglePublic={onToggleImagePublicStatus}
        />
      ))}
    </div>
  );
};
