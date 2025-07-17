const API_BASE_URL = import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api';

export interface UserCreditInfo {
  id: string;
  nickname: string;
  firebase_uid: string;
  phone_number: string;
  legacy_credits: number;
  unified_credits: number;
  user_type: string;
}

export interface MultipleUsersResponse {
  success: boolean;
  users: UserCreditInfo[];
  count: number;
  message: string;
}

export interface SingleUserResponse {
  success: boolean;
  user: UserCreditInfo;
}

export interface AddCreditsRequest {
  userIdentifier: string; // ニックネームまたはFirebase UID
  amount: number;
  description: string;
}

export interface AddCreditsResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    nickname: string;
    firebase_uid: string;
    credits: number;
  };
}

/**
 * ユーザーのクレジット情報を取得（単一または複数）
 */
export const getUserCredits = async (userIdentifier: string): Promise<UserCreditInfo[] | UserCreditInfo> => {
  try {
    const url = `${API_BASE_URL}/admin/credits/check/?user=${encodeURIComponent(userIdentifier)}`;
    console.log('API Request URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('API Response Status:', response.status);
    const data = await response.json();
    console.log('API Response Data:', data);
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'ユーザー情報の取得に失敗しました');
    }

    // 複数のユーザーが見つかった場合
    if (data.users && Array.isArray(data.users)) {
      return data.users;
    }
    
    // 単一のユーザーが見つかった場合
    return data.user;
  } catch (error) {
    console.error('Get user credits error:', error);
    throw error;
  }
};

/**
 * ユーザーにクレジットを追加
 */
export const addCreditsToUser = async (request: AddCreditsRequest): Promise<AddCreditsResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/credits/add/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'クレジット追加に失敗しました');
    }
    
    return data;
  } catch (error) {
    console.error('Add credits error:', error);
    throw error;
  }
};