import React, { useState } from 'react';

interface MockPaymentFormProps {
  userId: string;
  chargeAmount: number;
  creditAmount: number;
  onSuccess: (creditBalance: number) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export const MockPaymentForm: React.FC<MockPaymentFormProps> = ({
  userId,
  chargeAmount,
  creditAmount,
  onSuccess,
  onError,
  onCancel
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!cardNumber || !expiryDate || !cvv) {
      onError('すべてのカード情報を入力してください');
      return;
    }

    setIsProcessing(true);

    // モック決済処理（3秒後に成功）
    setTimeout(() => {
      console.log('モック決済完了:', {
        userId,
        chargeAmount,
        creditAmount
      });
      
      // 仮のクレジット残高を計算（既存残高 + 新規クレジット）
      const mockNewBalance = 1000 + creditAmount;
      onSuccess(mockNewBalance);
      setIsProcessing(false);
    }, 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-yellow-900/50 border border-yellow-500 text-yellow-200 px-4 py-3 rounded-lg mb-4">
        <div className="flex items-center">
          <span className="text-lg mr-2">⚠️</span>
          <span className="text-sm">
            <strong>モック決済モード</strong> - 実際の課金は発生しません
          </span>
        </div>
      </div>

      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-indigo-300 mb-4">
          決済情報（テスト用）
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              カード番号
            </label>
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              placeholder="4242 4242 4242 4242"
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-gray-200 placeholder-gray-400"
              maxLength={19}
            />
          </div>
          
          <div className="flex space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                有効期限
              </label>
              <input
                type="text"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                placeholder="MM/YY"
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-gray-200 placeholder-gray-400"
                maxLength={5}
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                CVV
              </label>
              <input
                type="text"
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="123"
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-gray-200 placeholder-gray-400"
                maxLength={4}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-700 p-4 rounded-lg">
        <h4 className="text-sm font-medium text-gray-300 mb-2">注文内容</h4>
        <div className="text-sm text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>チャージ金額:</span>
            <span>¥{chargeAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>付与クレジット:</span>
            <span>{creditAmount.toLocaleString()} クレジット</span>
          </div>
        </div>
      </div>

      <div className="flex space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 bg-gray-600 hover:bg-gray-700 text-gray-200 font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
          disabled={isProcessing}
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isProcessing}
          className={`flex-1 font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out ${
            isProcessing
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isProcessing ? '処理中...' : `¥${chargeAmount.toLocaleString()} で決済（テスト）`}
        </button>
      </div>
    </form>
  );
};
