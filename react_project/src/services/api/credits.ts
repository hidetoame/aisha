import axios from 'axios';
import {
  CreditsRequestParams,
  CreditsOperationResponseParams,
  CreditsFetchParams,
} from '@/types';
import { keysToSnakeCase, keysToCamelCase } from '@/utils/caseConverter';

const API_BASE = `${import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api'}`;

export const fetchCredits = async (
  userId: string,
  onError?: (error: unknown) => void,
): Promise<CreditsFetchParams | null> => {
  console.log('🌐 fetchCredits called with:', { userId, API_BASE });
  
  try {
    const url = `${API_BASE}/users/${userId}/credits/`;
    console.log('📡 Making API call to:', url);
    
    const response = await axios.get(url);
    console.log('✅ API response status:', response.status);
    console.log('📊 API response data:', response.data);
    
    const data = keysToCamelCase(response.data);
    console.log('🔄 Converted data:', data);
    
    // バックエンドAPIのレスポンス形式に合わせて変換
    const result = {
      credits: data.creditBalance
    };
    console.log('💎 Final result:', result);
    
    return result;
  } catch (err) {
    console.error('💥 クレジット取得失敗', err);
    onError?.(err);
    return null;
  }
};

export const chargeCredits = async (
  chargeOption: CreditsRequestParams,
  onError?: (error: unknown) => void,
): Promise<CreditsOperationResponseParams | null> => {
  try {
    const response = await axios.post(
      `${API_BASE}/charges/`,
      keysToSnakeCase(chargeOption),
    );
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('クレジットチャージ失敗', err);
    onError?.(err);
    return null;
  }
};

export const consumeCredits = async (
  consumeRequest: CreditsRequestParams & { user_id: string },
  onError?: (error: unknown) => void,
): Promise<CreditsOperationResponseParams | null> => {
  try {
    console.log('🌐 consumeCredits called with:', { consumeRequest, API_BASE });
    
    // 正しいAPIエンドポイントを使用
    const url = `${API_BASE}/unified-credits/consume/`;
    console.log('📡 Making API call to:', url);
    
    // UnifiedCreditServiceのAPI形式に合わせてデータを変換
    const requestData = {
      user_id: consumeRequest.user_id,
      amount: consumeRequest.credits,
      description: '画像生成によるクレジット消費'
    };
    
    console.log('📤 Request data:', requestData);
    
    const response = await axios.post(url, requestData);
    console.log('✅ API response status:', response.status);
    console.log('📊 API response data:', response.data);
    
    // UnifiedCreditServiceのレスポンス形式に合わせて変換
    const result = {
      success: response.data.success,
      message: response.data.message,
      remainingBalance: response.data.remaining_balance || 0
    };
    
    console.log('💎 Final result:', result);
    return result;
  } catch (err) {
    console.error('💥 クレジット消費失敗', err);
    onError?.(err);
    return null;
  }
};

export const fetchPaymentHistory = async (
  userId: string,
  limit: number = 20,
  offset: number = 0,
  onError?: (error: unknown) => void,
): Promise<any | null> => {
  console.log('🌐 fetchPaymentHistory called with:', { userId, limit, offset, API_BASE });
  
  try {
    const url = `${API_BASE}/users/${userId}/charge-history/?limit=${limit}&offset=${offset}`;
    console.log('📡 Making API call to:', url);
    
    const response = await axios.get(url);
    console.log('✅ API response status:', response.status);
    console.log('📊 API response data:', response.data);
    
    const data = keysToCamelCase(response.data);
    console.log('🔄 Converted data:', data);
    
    return data;
  } catch (err) {
    console.error('💥 決済履歴取得失敗', err);
    onError?.(err);
    return null;
  }
};
