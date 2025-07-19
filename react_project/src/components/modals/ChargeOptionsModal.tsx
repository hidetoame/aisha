import React, { useState } from 'react';
import { useChargeOptions } from '@/contexts/ChargeOptionsContext';
import { Plan, User } from '@/types';
import { StripePaymentForm } from './StripePaymentForm';
import { MockPaymentForm } from './MockPaymentForm';
import { useToast } from '@/contexts/ToastContext'; // Added
import { ClipboardDocumentListIcon } from '@/components/icons/HeroIcons'; // Added

interface ChargeOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan: (plan: Plan) => void;
  currentUser: User | null;
  onPaymentHistoryClick?: () => void; // Added
}

export const ChargeOptionsModal: React.FC<ChargeOptionsModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
  currentUser,
  onPaymentHistoryClick, // Added
}) => {
  const { showToast } = useToast(); // Added
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  
  // 全てのHooksを最上部で呼び出す
  const chargeOptions = useChargeOptions()?.filter((option) => option.isActive);

  // 関数定義を上に移動
  const handleModalClose = () => {
    setShowPaymentForm(false);
    setSelectedPlan(null);
    onClose();
  };

  if (!isOpen) return null;

  // ユーザーがログインしていない場合
  if (!currentUser) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-6 text-center text-indigo-400">
            ログインが必要です
          </h2>
          <p className="text-gray-300 mb-6 text-center">
            クレジットをチャージするには、まずログインしてください。
          </p>
          <button
            onClick={handleModalClose}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
          >
            閉じる
          </button>
        </div>
      </div>
    );
  }

  // APIにより取得したデータ
  // 有効なオプションのみ表示
  
  // チャージオプションが取得できない場合は固定プランを使用
  const defaultChargeOptions = [
    {
      id: 1,
      name: '500クレジット',
      priceYen: 500,
      creditsAwarded: 500,
      creditsBonus: 0,
      isActive: true
    },
    {
      id: 2,
      name: '1100クレジット',
      priceYen: 1000,
      creditsAwarded: 1100,
      creditsBonus: 100,
      isActive: true
    }
  ];
  
  const displayOptions = chargeOptions && chargeOptions.length > 0 ? chargeOptions : defaultChargeOptions;

  const handlePlanSelect = (option: any) => {
    const plan: Plan = {
      id: option.id,
      name: option.name,
      price: option.priceYen,
      credits: option.creditsAwarded,
    };
    setSelectedPlan(plan);
    setShowPaymentForm(true);
  };

  const handlePaymentSuccess = (creditBalance: number) => {
    console.log('決済成功！新しいクレジット残高:', creditBalance);
    // 成功通知を表示
    showToast('success', `決済が完了しました！${selectedPlan?.credits}クレジットが追加されました。`);
    // 成功時の処理
    if (selectedPlan) {
      onSelectPlan(selectedPlan);
    }
    setShowPaymentForm(false);
    setSelectedPlan(null);
    onClose();
  };

  const handlePaymentError = (error: string) => {
    console.error('決済エラー:', error);
    // toast通知でエラーを表示
    const errorMessage = error.includes('Your card was declined') 
      ? 'カードが拒否されました。別のカードをお試しください。'
      : error.includes('Your card number is incomplete')
      ? 'カード番号が不完全です。正しいカード番号を入力してください。'
      : error.includes('expiration date is incomplete')
      ? 'カードの有効期限が不完全です。MM/YY形式で入力してください。'
      : error.includes('security code is incomplete')
      ? 'セキュリティコードが不完全です。カード裏面の3桁または4桁の番号を入力してください。'
      : error.includes('Failed to create charge')
      ? '決済の初期化に失敗しました。しばらく待ってから再度お試しください。'
      : `決済エラー: ${error}`;
    
    showToast('error', errorMessage);
  };

  const handlePaymentCancel = () => {
    setShowPaymentForm(false);
    setSelectedPlan(null);
  };

  // 決済フォーム表示中
  if (showPaymentForm && selectedPlan) {
    // 常にStripe決済フォームを表示（APIから正しいキーを取得）
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-lg">
          <h2 className="text-2xl font-semibold mb-6 text-center text-indigo-400">
            クレジット決済
          </h2>
          
          <StripePaymentForm
            userId={currentUser?.id || 'anonymous'}
            chargeAmount={selectedPlan.price}
            creditAmount={selectedPlan.credits}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancel}
          />
        </div>
      </div>
    );
  }

  // プラン選択画面
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-2xl font-semibold mb-6 text-center text-indigo-400">
          クレジットをチャージ
        </h2>
        
        {/* 決済履歴ボタン */}
        {currentUser && onPaymentHistoryClick && (
          <div className="mb-4">
            <button
              onClick={onPaymentHistoryClick}
              className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-2 px-4 rounded-lg transition duration-150 ease-in-out flex items-center justify-center"
            >
              <ClipboardDocumentListIcon className="w-5 h-5 mr-2" />
              決済履歴を確認
            </button>
          </div>
        )}
        
        <div className="space-y-4">
          {displayOptions?.map((option) => (
            <div
              key={option.id}
              className="p-4 border border-gray-700 rounded-lg bg-gray-700/50"
            >
              <h3 className="text-lg font-medium text-indigo-300">
                  {(option as any).displayInfo || `${option.creditsAwarded} クレジット`}
                  {(option.creditsBonus || 0) > 0 && (
                  <span className="text-sm text-yellow-400 font-semibold ml-2">
                    (+{option.creditsBonus} お得!)
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-400 mb-3">
                ¥{option.priceYen} で購入
              </p>
              <button
                onClick={() => handlePlanSelect(option)}
                className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-150 ease-in-out"
              >
                ¥{option.priceYen} チャージ
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleModalClose}
          className="mt-6 w-full bg-gray-600 hover:bg-gray-700 text-gray-200 font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};
