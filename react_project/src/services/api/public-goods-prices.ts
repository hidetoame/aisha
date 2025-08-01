import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api'}`;

export interface GoodsPrice {
  suzuri_item_id: number;
  base_price: number;
  profit_margin: number;
  final_price: number;
}

export const fetchGoodsPrices = async (
  onError?: (error: unknown) => void
): Promise<Map<number, GoodsPrice>> => {
  try {
    const response = await axios.get(`${API_BASE}/goods/public/`);
    if (response.data.success) {
      const priceMap = new Map<number, GoodsPrice>();
      response.data.data.forEach((item: any) => {
        priceMap.set(item.suzuri_item_id, {
          suzuri_item_id: item.suzuri_item_id,
          base_price: item.base_price,
          profit_margin: item.profit_margin,
          final_price: item.base_price + item.profit_margin
        });
      });
      return priceMap;
    }
    return new Map();
  } catch (error) {
    console.error('[PublicGoodsPrices] 価格取得エラー:', error);
    if (onError) {
      onError(error);
    }
    return new Map();
  }
};