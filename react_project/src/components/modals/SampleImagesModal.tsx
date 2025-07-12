
import React from 'react';
import { XMarkIcon, PhotoIcon } from '@/components/icons/HeroIcons';

interface SampleImagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceUrl?: string;
  generatedUrl?: string;
  menuName?: string;
}

export const SampleImagesModal: React.FC<SampleImagesModalProps> = ({ 
  isOpen, 
  onClose, 
  sourceUrl, 
  generatedUrl,
  menuName
}) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[70] p-4" 
        onClick={onClose}
        aria-labelledby="sample-image-modal-title"
        role="dialog"
        aria-modal="true"
    >
      <div 
        className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
            onClick={onClose} 
            className="absolute top-3 right-3 text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-600/80 p-1.5 rounded-full z-10"
            aria-label="サンプル画像モーダルを閉じる"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
        <h2 id="sample-image-modal-title" className="text-xl font-semibold text-indigo-400 mb-4">
          「{menuName || "選択メニュー"}」の生成サンプル
        </h2>
        
        <div className="overflow-y-auto space-y-4 custom-scrollbar pr-1">
          <div>
            <h3 className="text-md font-medium text-gray-300 mb-2">元画像</h3>
            {sourceUrl ? (
              <img src={sourceUrl} alt="サンプル元画像" className="w-full h-auto max-h-80 object-contain rounded-md bg-gray-700 p-1" />
            ) : (
              <div className="flex flex-col items-center justify-center h-40 bg-gray-700 rounded-md text-gray-500">
                <PhotoIcon className="w-12 h-12 mb-2"/>
                <p>元画像のサンプルはありません</p>
              </div>
            )}
          </div>
          
          <div>
            <h3 className="text-md font-medium text-gray-300 mb-2">生成画像</h3>
            {generatedUrl ? (
              <img src={generatedUrl} alt="サンプル生成後画像" className="w-full h-auto max-h-80 object-contain rounded-md bg-gray-700 p-1" />
            ) : (
                <div className="flex flex-col items-center justify-center h-40 bg-gray-700 rounded-md text-gray-500">
                  <PhotoIcon className="w-12 h-12 mb-2"/>
                  <p>生成後画像のサンプルはありません</p>
              </div>
            )}
          </div>
        </div>
        <button
            onClick={onClose}
            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 rounded-lg transition duration-150 ease-in-out"
        >
            閉じる
        </button>
      </div>
    </div>
  );
};
