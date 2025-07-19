const API_BASE_URL = import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api';

export interface GoodsManagementItem {
  id: number;
  supplier: string;
  suzuri_item_id: number;
  item_name: string;
  display_name: string;
  display_order: number;
  icon_url: string | null;
  sample_image_url: string | null;
  descriptions: string[];
  base_price: number;
  profit_margin: number;
  final_price: number;
  available_print_places: string[];
  is_multi_printable: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface GoodsManagementUpdateData {
  display_name?: string;
  display_order?: number;
  profit_margin?: number;
  is_public?: boolean;
}

export interface SyncSuzuriResponse {
  success: boolean;
  message: string;
  data: {
    synced_count: number;
    updated_count: number;
    total_items: number;
  };
}

// グッズ管理一覧を取得
export const getGoodsManagementList = async (): Promise<GoodsManagementItem[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/goods/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'グッズ管理一覧の取得に失敗しました');
    }
  } catch (error) {
    console.error('グッズ管理一覧取得エラー:', error);
    throw error;
  }
};

// グッズ管理詳細を取得
export const getGoodsManagementDetail = async (goodsId: number): Promise<GoodsManagementItem> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/goods/${goodsId}/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'グッズ管理詳細の取得に失敗しました');
    }
  } catch (error) {
    console.error('グッズ管理詳細取得エラー:', error);
    throw error;
  }
};

// グッズ管理情報を更新
export const updateGoodsManagement = async (
  goodsId: number,
  data: GoodsManagementUpdateData
): Promise<GoodsManagementItem> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/goods/${goodsId}/update/`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.error || 'グッズ管理の更新に失敗しました');
    }
  } catch (error) {
    console.error('グッズ管理更新エラー:', error);
    throw error;
  }
};

// SUZURIアイテムを同期
export const syncSuzuriItems = async (): Promise<SyncSuzuriResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/goods/sync-suzuri/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('firebase_token')}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      return result;
    } else {
      throw new Error(result.error || 'SUZURIアイテムの同期に失敗しました');
    }
  } catch (error) {
    console.error('SUZURIアイテム同期エラー:', error);
    throw error;
  }
}; 