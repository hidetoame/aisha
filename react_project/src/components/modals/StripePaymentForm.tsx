import React, { useState, useEffect, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import axios from 'axios';

// Stripeのpublishable keyを取得
let stripePromise: Promise<any>;
const getStripe = async () => {
  if (!stripePromise) {
    try {
      console.log('Stripe設定を取得中...');
      const response = await axios.get('http://localhost:7999/api/stripe/config/');
      console.log('Stripe設定レスポンス:', response.data);
      
      const publishableKey = response.data.publishable_key;
      if (!publishableKey || publishableKey === 'pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY') {
        throw new Error('有効なStripe公開可能キーが設定されていません');
      }
      
      stripePromise = loadStripe(publishableKey);
      console.log('Stripe読み込み開始:', publishableKey);
    } catch (error) {
      console.error('Stripe設定の取得に失敗:', error);
      // フォールバック：環境変数から取得
      const fallbackKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
      if (fallbackKey && fallbackKey !== 'pk_test_YOUR_ACTUAL_PUBLISHABLE_KEY') {
        stripePromise = loadStripe(fallbackKey);
      } else {
        throw new Error('Stripeキーが設定されていません');
      }
    }
  }
  return stripePromise;
};

interface StripePaymentFormProps {
  userId: string;
  chargeAmount: number;
  creditAmount: number;
  onSuccess: (creditBalance: number) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

const PaymentForm: React.FC<StripePaymentFormProps> = ({
  userId,
  chargeAmount,
  creditAmount,
  onSuccess,
  onError,
  onCancel
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [cardNumberError, setCardNumberError] = useState<string | null>(null);
  const [cardExpiryError, setCardExpiryError] = useState<string | null>(null);
  const [cardCvcError, setCardCvcError] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState<string>('');
  
  // useRefを使用した重複実行防止
  const isCreatingRef = useRef(false);

  // PaymentIntentを作成
  useEffect(() => {
    if (isInitialized || isCreating || isCreatingRef.current) return; // 重複実行を防ぐ
    
    const createPaymentIntent = async () => {
      if (isCreatingRef.current) return; // 二重チェック
      isCreatingRef.current = true;
      setIsCreating(true);
      
      try {
        const requestData = {
          user_id: userId,
          charge_amount: chargeAmount,
          credit_amount: creditAmount
        };
        
        console.log('🔍 チャージリクエストデータ:', requestData);
        
        const response = await axios.post('http://localhost:7999/api/charges/', requestData);
        
        setClientSecret(response.data.client_secret);
        setIsInitialized(true);
      } catch (error: any) {
        console.error('PaymentIntent作成エラー:', error);
        onError(error.response?.data?.message || '決済の初期化に失敗しました');
      } finally {
        setIsCreating(false);
        isCreatingRef.current = false;
      }
    };

    createPaymentIntent();
  }, [userId, chargeAmount, creditAmount, isInitialized]); // onErrorを依存配列から削除

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      setPaymentError('カード情報の取得に失敗しました');
      setIsProcessing(false);
      return;
    }

    try {
      // 決済を確認
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberElement,
          billing_details: {
            name: `User ${userId}`,
            address: {
              postal_code: postalCode,
            },
          },
        },
      });

      if (error) {
        setPaymentError(error.message || '決済に失敗しました');
        setIsProcessing(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        console.log('✅ Stripe決済成功:', paymentIntent.id);
        
        // バックエンドに決済完了を通知
        try {
          const confirmResponse = await axios.post('http://localhost:7999/api/charges/confirm/', {
            payment_intent_id: paymentIntent.id,
            user_id: userId
          });
          
          console.log('✅ 決済確認成功:', confirmResponse.data);
          onSuccess(confirmResponse.data.credit_balance);
        } catch (confirmError: any) {
          console.error('❌ 決済確認API失敗（但し決済は成功）:', confirmError);
          
          // 決済確認APIが失敗してもStripe決済は成功しているので、
          // とりあえず成功として扱う（残高は別途取得）
          console.log('⚠️ 決済確認APIエラーだが、Stripe決済は成功済みのため成功扱い');
          onSuccess(0); // 残高は0にして、別途更新される
        }
      } else {
        setPaymentError('決済が完了しませんでした');
      }
    } catch (error: any) {
      console.error('決済エラー:', error);
      setPaymentError('決済処理中にエラーが発生しました');
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#e5e7eb',
        backgroundColor: 'transparent',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        '::placeholder': {
          color: '#9ca3af',
        },
      },
      invalid: {
        color: '#f87171',
        iconColor: '#f87171',
      },
    },
  };

  // 各フィールドのエラーハンドリング
  const handleCardNumberChange = (event: any) => {
    setCardNumberError(event.error ? event.error.message : null);
  };

  const handleCardExpiryChange = (event: any) => {
    setCardExpiryError(event.error ? event.error.message : null);
  };

  const handleCardCvcChange = (event: any) => {
    setCardCvcError(event.error ? event.error.message : null);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-indigo-300 mb-4">
          決済情報
        </h3>
        
        {/* カード番号 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            カード番号
          </label>
          <div className="p-3 border border-gray-600 rounded-lg bg-gray-800">
            <CardNumberElement 
              options={cardElementOptions} 
              onChange={handleCardNumberChange}
            />
          </div>
          {cardNumberError && (
            <p className="text-red-400 text-sm mt-1">{cardNumberError}</p>
          )}
        </div>

        {/* 有効期限とCVC */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              有効期限
            </label>
            <div className="p-3 border border-gray-600 rounded-lg bg-gray-800">
              <CardExpiryElement 
                options={cardElementOptions} 
                onChange={handleCardExpiryChange}
              />
            </div>
            {cardExpiryError && (
              <p className="text-red-400 text-sm mt-1">{cardExpiryError}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              CVC
            </label>
            <div className="p-3 border border-gray-600 rounded-lg bg-gray-800">
              <CardCvcElement 
                options={cardElementOptions} 
                onChange={handleCardCvcChange}
              />
            </div>
            {cardCvcError && (
              <p className="text-red-400 text-sm mt-1">{cardCvcError}</p>
            )}
          </div>
        </div>

        {/* 郵便番号 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            郵便番号（任意）
          </label>
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder="123-4567"
            className="w-full p-3 border border-gray-600 rounded-lg bg-gray-800 text-gray-200 placeholder-gray-500 focus:ring-indigo-500 focus:border-indigo-500"
            maxLength={8}
          />
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

      {paymentError && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
          {paymentError}
        </div>
      )}

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
          disabled={!stripe || isProcessing || !clientSecret}
          className={`flex-1 font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out ${
            isProcessing || !stripe || !clientSecret
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isProcessing ? '処理中...' : `¥${chargeAmount.toLocaleString()} で決済`}
        </button>
      </div>
    </form>
  );
};

export const StripePaymentForm: React.FC<StripePaymentFormProps> = (props) => {
  const [stripeInstance, setStripeInstance] = useState<any>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initStripe = async () => {
      try {
        setIsLoading(true);
        setLoadingError(null);
        
        // タイムアウト処理（10秒）
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Stripe読み込みがタイムアウトしました')), 10000)
        );
        
        const stripe = await Promise.race([getStripe(), timeoutPromise]);
        setStripeInstance(stripe);
        console.log('Stripe初期化完了');
      } catch (error: any) {
        console.error('Stripe初期化エラー:', error);
        setLoadingError(error.message || 'Stripeの読み込みに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    initStripe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-4"></div>
          決済システムを読み込み中...
        </div>
      </div>
    );
  }

  if (loadingError) {
    return (
      <div className="p-6 text-center">
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
          <h3 className="font-semibold mb-2">決済システムの読み込みエラー</h3>
          <p className="text-sm">{loadingError}</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg"
        >
          ページを再読み込み
        </button>
      </div>
    );
  }

  if (!stripeInstance) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-400">決済システムの初期化に失敗しました</div>
      </div>
    );
  }

  return (
    <Elements stripe={stripeInstance}>
      <PaymentForm {...props} />
    </Elements>
  );
};
