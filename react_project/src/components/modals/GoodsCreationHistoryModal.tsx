
import React from 'react';
import { GoodsCreationRecord } from '@/types';
import { XMarkIcon, ShoppingBagIcon, CalendarDaysIcon, CreditCardIcon, InformationCircleIcon } from '@/components/icons/HeroIcons';

interface GoodsCreationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: GoodsCreationRecord[];
}

export const GoodsCreationHistoryModal: React.FC<GoodsCreationHistoryModalProps> = ({ isOpen, onClose, history }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-semibold text-indigo-400">グッズ作成履歴 (モック)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700">
            <XMarkIcon className="w-6 md:w-7 h-6 md:h-7" />
          </button>
        </div>
        {history.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-gray-500 py-8">
            <ShoppingBagIcon className="w-16 h-16 md:w-20 md:h-20 mb-4" />
            <p className="text-lg md:text-xl">グッズ作成履歴はまだありません。</p>
            <p className="text-sm md:text-base">画像からグッズを作成するとここに追加されます。</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 overflow-y-auto flex-grow custom-scrollbar pr-1">
            {history.map((record) => (
              <div key={record.id} className="bg-gray-700 rounded-lg shadow-md overflow-hidden flex flex-col group transition-all hover:shadow-indigo-500/30 hover:ring-1 hover:ring-indigo-500">
                <div className="aspect-square w-full bg-gray-600 flex items-center justify-center">
                  {record.imageUrl ? (
                    <img src={record.imageUrl} alt={record.goodsName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <ShoppingBagIcon className="w-1/2 h-1/2 text-gray-500" />
                  )}
                </div>
                <div className="p-2 md:p-3 text-xs flex flex-col flex-grow justify-between">
                  <div>
                    <p className="font-semibold text-indigo-300 mb-0.5 truncate group-hover:text-indigo-200" title={record.goodsName}>{record.goodsName}</p>
                    {record.prompt && <p className="text-gray-400 text-[10px] leading-tight line-clamp-2 mb-1" title={record.prompt}>{record.prompt}</p>}
                    {record.selectedVariations && Object.keys(record.selectedVariations).length > 0 && (
                      <div className="mt-1 mb-1.5 space-y-0.5">
                        {Object.entries(record.selectedVariations).map(([key, value]) => (
                          <div key={key} className="flex items-center text-gray-400 text-[10px]">
                            <InformationCircleIcon className="w-3 h-3 mr-1 flex-shrink-0 text-gray-500" />
                            <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                            <span className="font-medium text-gray-300 ml-1">{value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-auto space-y-0.5">
                    <div className="flex items-center text-gray-500 text-[10px]">
                      <CalendarDaysIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span>{new Date(record.timestamp).toLocaleDateString('ja-JP', { year: '2-digit', month: '2-digit', day: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center text-indigo-400/80 text-[10px]">
                      <CreditCardIcon className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span>{record.creditCost} クレジット</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
