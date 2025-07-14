import React, { useState } from 'react';
import { XMarkIcon } from '../icons/HeroIcons';

type AnchorPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'mid-left' | 'center' | 'mid-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

interface DirectionSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (anchorPosition: AnchorPosition) => void;
  imageName?: string;
}

// 方向グリッドの設定
const DIRECTION_GRID: AnchorPosition[][] = [
  ['top-left', 'top-center', 'top-right'],
  ['mid-left', 'center', 'mid-right'],
  ['bottom-left', 'bottom-center', 'bottom-right'],
];

// 拡張方向を取得する関数
const getDisplayPattern = (selectedPosition: AnchorPosition): Record<AnchorPosition, string> => {
  const patterns: Record<AnchorPosition, Record<AnchorPosition, string>> = {
    'top-left': {
      'top-left': '●', 'top-center': '→', 'top-right': '',
      'mid-left': '↓', 'center': '↘', 'mid-right': '',
      'bottom-left': '', 'bottom-center': '', 'bottom-right': ''
    },
    'top-center': {
      'top-left': '←', 'top-center': '●', 'top-right': '→',
      'mid-left': '↙', 'center': '↓', 'mid-right': '↘',
      'bottom-left': '', 'bottom-center': '', 'bottom-right': ''
    },
    'top-right': {
      'top-left': '', 'top-center': '←', 'top-right': '●',
      'mid-left': '', 'center': '↙', 'mid-right': '↓',
      'bottom-left': '', 'bottom-center': '', 'bottom-right': ''
    },
    'mid-left': {
      'top-left': '↑', 'top-center': '↗', 'top-right': '',
      'mid-left': '●', 'center': '→', 'mid-right': '',
      'bottom-left': '↓', 'bottom-center': '↘', 'bottom-right': ''
    },
    'center': {
      'top-left': '↖', 'top-center': '↑', 'top-right': '↗',
      'mid-left': '←', 'center': '●', 'mid-right': '→',
      'bottom-left': '↙', 'bottom-center': '↓', 'bottom-right': '↘'
    },
    'mid-right': {
      'top-left': '', 'top-center': '↖', 'top-right': '↑',
      'mid-left': '', 'center': '←', 'mid-right': '●',
      'bottom-left': '', 'bottom-center': '↙', 'bottom-right': '↓'
    },
    'bottom-left': {
      'top-left': '', 'top-center': '', 'top-right': '',
      'mid-left': '↑', 'center': '↗', 'mid-right': '',
      'bottom-left': '●', 'bottom-center': '→', 'bottom-right': ''
    },
    'bottom-center': {
      'top-left': '', 'top-center': '', 'top-right': '',
      'mid-left': '↖', 'center': '↑', 'mid-right': '↗',
      'bottom-left': '←', 'bottom-center': '●', 'bottom-right': '→'
    },
    'bottom-right': {
      'top-left': '', 'top-center': '', 'top-right': '',
      'mid-left': '', 'center': '↖', 'mid-right': '↑',
      'bottom-left': '', 'bottom-center': '←', 'bottom-right': '●'
    }
  };
  
  return patterns[selectedPosition] || {};
};

// 方向のアイコン表示
const DIRECTION_ICONS: Record<AnchorPosition, string> = {
  'top-left': '↖',
  'top-center': '↑',
  'top-right': '↗',
  'mid-left': '←',
  'center': '●',
  'mid-right': '→',
  'bottom-left': '↙',
  'bottom-center': '↓',
  'bottom-right': '↘',
};

export const DirectionSelectionModal: React.FC<DirectionSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  imageName = '画像',
}) => {
  const [selectedPosition, setSelectedPosition] = useState<AnchorPosition>('center');

  const handleAnchorClick = (position: AnchorPosition) => {
    setSelectedPosition(position);
  };

  const handleConfirm = () => {
    onConfirm(selectedPosition);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black bg-opacity-10">
      <div className="bg-gray-800 border-2 border-indigo-500 rounded-lg shadow-2xl max-w-sm w-full mx-4 p-6">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">
            拡張方向を選択
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* 方向選択グリッド */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {DIRECTION_GRID.map((row, rowIndex) =>
            row.map((position, colIndex) => {
              const isSelected = selectedPosition === position;
              const displayPattern = getDisplayPattern(selectedPosition);
              const displayContent = displayPattern[position] || '';
              
              return (
                <button
                  key={position}
                  onClick={() => handleAnchorClick(position)}
                  className={`
                    aspect-square border-2 rounded-lg flex items-center justify-center text-2xl transition-all cursor-pointer
                    ${isSelected 
                      ? 'border-blue-400 bg-blue-600 text-white shadow-lg' 
                      : displayContent
                      ? 'border-blue-400 bg-blue-600 text-white shadow-lg'
                      : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-600 text-gray-300'
                    }
                  `}
                >
                  {displayContent}
                </button>
              );
            })
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            拡張を実行
          </button>
        </div>
      </div>
    </div>
  );
};