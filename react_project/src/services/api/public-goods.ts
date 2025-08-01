import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api'}/timeline`;

export interface PublicGoods {
  id: number;
  product_id: number;
  product_title: string;
  product_url: string;
  sample_image_url: string;
  item_name: string;
  item_id: number;
  created_at: string;
}

export const fetchGoodsByImage = async (
  frontendId: string,
  onError?: (error: unknown) => void
): Promise<PublicGoods[]> => {
  try {
    const response = await axios.get(`${API_BASE}/share/${frontendId}/goods/`);
    if (response.data.success) {
      return response.data.goods;
    }
    return [];
  } catch (error) {
    console.error('[PublicGoods] グッズ取得エラー:', error);
    if (onError) {
      onError(error);
    }
    return [];
  }
};