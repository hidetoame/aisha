import React from 'react';
import { useChargeOptions } from '@/contexts/ChargeOptionsContext';
import { Plan } from '@/types';

interface ChargeOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: Plan) => void;
}

export const ChargeOptionsModal: React.FC<ChargeOptionsModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
}) => {
  if (!isOpen) return null;

  // APIにより取得したデータ
  // 有効なオプションのみ表示
  const chargeOptions = useChargeOptions()?.filter((option) => option.isActive);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-center text-indigo-400">
          クレジットをチャージ
        </h2>
        <div className="space-y-4">
          {chargeOptions?.map((option) => (
            <div
              key={option.id}
              className="p-4 border border-gray-700 rounded-lg bg-gray-700/50"
            >
              <h3 className="text-lg font-medium text-indigo-300">
                {option.creditsAwarded} クレジット
                {option.creditsBonus && (
                  <span className="text-sm text-yellow-400 font-semibold ml-2">
                    (+{option.creditsBonus} お得!)
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-400 mb-3">
                ¥{option.priceYen} で購入
              </p>
              <button
                onClick={() =>
                  onSelectPlan({
                    id: option.id,
                    name: option.name,
                    price: option.priceYen,
                    credits: option.creditsAwarded,
                  })
                }
                className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-150 ease-in-out"
              >
                ¥{option.priceYen} チャージ
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full bg-gray-600 hover:bg-gray-700 text-gray-200 font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
