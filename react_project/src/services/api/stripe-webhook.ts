import { AISHA_API_BASE } from '@/constants';

export interface PaymentStatus {
  payment_intent_id: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  error_message?: string;
  created_at: string;
}

export interface WebhookResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// 環境判定
export const isProduction = () => {
  return import.meta.env.PROD || import.meta.env.VITE_ENVIRONMENT === 'production';
};

// 決済状態をポーリングで確認（本番環境用）
export const pollPaymentStatus = async (
  paymentIntentId: string,
  maxAttempts: number = 30,
  interval: number = 2000
): Promise<PaymentStatus | null> => {
  if (!isProduction()) {
    console.log('ローカル環境: ポーリングは無効です');
    return null;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${AISHA_API_BASE}/stripe/payment-status/${paymentIntentId}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const paymentStatus = result.data;
          
          // 決済が完了した場合
          if (paymentStatus.status === 'success' || paymentStatus.status === 'failed') {
            return paymentStatus;
          }
        }
      }
    } catch (error) {
      console.error('決済状態確認エラー:', error);
    }

    // 次のポーリングまで待機
    await new Promise(resolve => setTimeout(resolve, interval));
  }

  console.warn('決済状態の確認がタイムアウトしました');
  return null;
};

// Webhookテスト（開発用）
export const testWebhook = async (): Promise<WebhookResponse> => {
  try {
    const response = await fetch(`${AISHA_API_BASE}/stripe/webhook/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        test: true,
        message: 'Webhook test from frontend'
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Webhookテストエラー:', error);
    return {
      success: false,
      error: 'Webhookテストに失敗しました'
    };
  }
};

// 決済処理の環境別分岐
export const processPayment = async (
  paymentMethod: any,
  amount: number,
  currency: string = 'jpy'
): Promise<{ success: boolean; payment_intent_id?: string; error?: string }> => {
  if (isProduction()) {
    // 本番環境: Webhook処理
    return await processPaymentWithWebhook(paymentMethod, amount, currency);
  } else {
    // ローカル環境: 現在の処理を維持
    return await processPaymentLocal(paymentMethod, amount, currency);
  }
};

// 本番環境用: Webhook処理
const processPaymentWithWebhook = async (
  paymentMethod: any,
  amount: number,
  currency: string
): Promise<{ success: boolean; payment_intent_id?: string; error?: string }> => {
  try {
    // Payment Intentを作成
    const response = await fetch(`${AISHA_API_BASE}/charges/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`,
      },
      body: JSON.stringify({
        payment_method_id: paymentMethod.id,
        amount: amount,
        currency: currency,
        use_webhook: true
      }),
    });

    const result = await response.json();
    
    if (result.success && result.payment_intent_id) {
      // Webhookからの結果を待機
      const paymentStatus = await pollPaymentStatus(result.payment_intent_id);
      
      if (paymentStatus) {
        if (paymentStatus.status === 'success') {
          return {
            success: true,
            payment_intent_id: result.payment_intent_id
          };
        } else {
          return {
            success: false,
            error: paymentStatus.error_message || '決済に失敗しました'
          };
        }
      } else {
        return {
          success: false,
          error: '決済状態の確認がタイムアウトしました'
        };
      }
    } else {
      return {
        success: false,
        error: result.error || '決済の開始に失敗しました'
      };
    }
  } catch (error) {
    console.error('Webhook決済処理エラー:', error);
    return {
      success: false,
      error: '決済処理中にエラーが発生しました'
    };
  }
};

// ローカル環境用: 現在の処理
const processPaymentLocal = async (
  paymentMethod: any,
  amount: number,
  currency: string
): Promise<{ success: boolean; payment_intent_id?: string; error?: string }> => {
  try {
    // 現在の決済処理をそのまま使用
    const response = await fetch(`${AISHA_API_BASE}/charges/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`,
      },
      body: JSON.stringify({
        payment_method_id: paymentMethod.id,
        amount: amount,
        currency: currency,
        use_webhook: false
      }),
    });

    const result = await response.json();
    
    if (result.success) {
      return {
        success: true,
        payment_intent_id: result.payment_intent_id
      };
    } else {
      return {
        success: false,
        error: result.error || '決済に失敗しました'
      };
    }
  } catch (error) {
    console.error('ローカル決済処理エラー:', error);
    return {
      success: false,
      error: '決済処理中にエラーが発生しました'
    };
  }
}; 