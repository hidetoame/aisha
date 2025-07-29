import axios from 'axios';
import { AISHA_API_BASE } from '@/constants';

interface SMSAuthResponse {
  success: boolean;
  session_id: string;
  message: string;
  expires_in: number;
}

interface SMSVerifyResponse {
  success: boolean;
  user_id: string;
  phone_number: string;
  nickname: string;
  credits: number;
  auth_token: string;
  is_new_user: boolean;
}

interface UserUpdateResponse {
  success: boolean;
  user_id: string;
  nickname: string;
  credits: number;
}

interface SMSAuthError {
  error: string;
}

/**
 * AWS SNS経由でSMS認証コードを送信
 */
export const sendSMSVerification = async (phoneNumber: string): Promise<SMSAuthResponse> => {
  try {
    const response = await axios.post<SMSAuthResponse>(`${AISHA_API_BASE}/aws-sms-auth/send/`, {
      phone_number: phoneNumber
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      throw new Error(error.response.data.error || 'SMS送信に失敗しました');
    }
    throw new Error('SMS送信中にエラーが発生しました');
  }
};

/**
 * SMS認証コードを検証
 */
export const verifySMSCode = async (
  sessionId: string,
  verificationCode: string,
  phoneNumber: string
): Promise<SMSVerifyResponse> => {
  try {
    const response = await axios.post<SMSVerifyResponse>(`${AISHA_API_BASE}/aws-sms-auth/verify/`, {
      session_id: sessionId,
      verification_code: verificationCode,
      phone_number: phoneNumber
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      throw new Error(error.response.data.error || '認証コードの検証に失敗しました');
    }
    throw new Error('認証コードの検証中にエラーが発生しました');
  }
};

/**
 * ユーザー情報を更新
 */
export const updateUserInfo = async (
  userId: string,
  nickname: string
): Promise<UserUpdateResponse> => {
  try {
    const response = await axios.post<UserUpdateResponse>(`${AISHA_API_BASE}/aws-sms-auth/user-info/`, {
      user_id: userId,
      nickname: nickname
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data) {
      throw new Error(error.response.data.error || 'ユーザー情報の更新に失敗しました');
    }
    throw new Error('ユーザー情報の更新中にエラーが発生しました');
  }
};

/**
 * 電話番号を国際形式に変換
 */
export const convertToInternationalFormat = (phoneNumber: string): string => {
  // ハイフンとスペースを除去
  const cleanNumber = phoneNumber.replace(/[-\s]/g, '');
  
  // 日本の携帯電話番号の場合
  if (cleanNumber.match(/^(090|080|070)/)) {
    return `+81${cleanNumber.substring(1)}`;
  }
  
  // 既に国際形式の場合
  if (cleanNumber.startsWith('+81')) {
    return cleanNumber;
  }
  
  // 0から始まる場合
  if (cleanNumber.startsWith('0')) {
    return `+81${cleanNumber.substring(1)}`;
  }
  
  // それ以外の場合は+81を付加
  return `+81${cleanNumber}`;
};

/**
 * 電話番号をフォーマット（表示用）
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // ハイフンとスペースを除去
  const cleanNumber = phoneNumber.replace(/[-\s]/g, '');
  
  // 日本の携帯電話番号の場合、090-1234-5678の形式に変換
  if (cleanNumber.match(/^(090|080|070)/)) {
    return `${cleanNumber.substring(0, 3)}-${cleanNumber.substring(3, 7)}-${cleanNumber.substring(7)}`;
  }
  
  return phoneNumber;
};

/**
 * 電話番号のバリデーション
 */
export const validatePhoneNumber = (phoneNumber: string): boolean => {
  const cleanNumber = phoneNumber.replace(/[-\s]/g, '');
  
  // 日本の携帯電話番号の正規表現
  const japanMobileRegex = /^(090|080|070)\d{8}$/;
  
  return japanMobileRegex.test(cleanNumber);
};