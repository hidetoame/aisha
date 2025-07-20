const API_BASE_URL = import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api';

export interface UserCreditInfo {
  id: string;
  nickname: string;
  firebase_uid: string;
  phone_number: string;
  legacy_credits: number;
  unified_credits: number;
  user_type: string;
  created_at?: string;
  last_login_at?: string;
  generated_images_count: number;
}

export interface UserStatistics {
  total_users: number;
  mygarage_users: number;
  phone_users: number;
}

export interface AllUsersResponse {
  success: boolean;
  statistics: UserStatistics;
  users: UserCreditInfo[];
  count: number;
  search_query?: string;
  limit?: number;
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

/**
 * 全ユーザー一覧を取得
 */
export const getAllUsers = async (searchQuery?: string, limit?: number): Promise<AllUsersResponse> => {
  try {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.append('search', searchQuery);
    }
    if (limit) {
      params.append('limit', limit.toString());
    }
    
    const url = `${API_BASE_URL}/admin/users/${params.toString() ? '?' + params.toString() : ''}`;
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
      throw new Error(data.message || 'ユーザー一覧の取得に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('Get all users error:', error);
    throw error;
  }
};

// 生成履歴管理関連の型定義
export interface GenerationHistoryStats {
  total_generations: number;
  library_registrations: number;
  public_images: number;
  goods_creations: number;
  category_stats: {
    illustration: number;
    scene_change: number;
    customization: number;
  };
}

export interface GenerationHistoryItem {
  id: string;
  user_id: string;
  user_name: string;
  image_url: string;
  display_prompt: string;
  menu_name: string | null;
  category: 'illustration' | 'scene_change' | 'customization';
  rating: 'good' | 'bad' | null;
  is_public: boolean;
  is_saved_to_library: boolean;
  goods_creation_count: number;
  created_at: string;
  timestamp: string;
}

export interface GenerationHistoryListResponse {
  success: boolean;
  history: GenerationHistoryItem[];
  total_count: number;
}

// 生成履歴統計を取得
export const getGenerationHistoryStats = async (): Promise<GenerationHistoryStats | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/generation-history/stats/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success) {
      return data.stats;
    } else {
      console.error('生成履歴統計取得エラー:', data.error);
      return null;
    }
  } catch (error) {
    console.error('生成履歴統計取得エラー:', error);
    return null;
  }
};

// 生成履歴一覧を取得
export const getGenerationHistoryList = async (
  params: {
    limit?: number;
    search?: string;
    category?: string;
    user?: string;
    rating?: string;
  } = {}
): Promise<GenerationHistoryListResponse | null> => {
  try {
    const searchParams = new URLSearchParams();
    
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.category) searchParams.append('category', params.category);
    if (params.user) searchParams.append('user', params.user);
    if (params.rating) searchParams.append('rating', params.rating);

    const response = await fetch(`${API_BASE_URL}/admin/generation-history/list/?${searchParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data.success) {
      return data;
    } else {
      console.error('生成履歴一覧取得エラー:', data.error);
      return null;
    }
  } catch (error) {
    console.error('生成履歴一覧取得エラー:', error);
    return null;
  }
};