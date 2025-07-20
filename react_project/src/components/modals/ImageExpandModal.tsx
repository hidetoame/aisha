import React from 'react';

interface ImageExpandModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}

export const ImageExpandModal: React.FC<ImageExpandModalProps> = ({
  isOpen,
  onClose,
  imageUrl
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="relative max-w-4xl max-h-full">
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-gray-800 hover:bg-gray-700 text-white rounded-full w-10 h-10 flex items-center justify-center transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* 画像 */}
        <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
          <img
            src={imageUrl}
            alt="拡大画像"
            className="max-w-full max-h-[80vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* 背景クリックで閉じる */}
        <div
          className="absolute inset-0 -z-10"
          onClick={onClose}
        />
      </div>
    </div>
  );
}; 