import { AISHA_API_BASE } from '@/constants';

export interface SuzuriMerchandiseRequest {
  image_url: string;
  car_name: string;
  description?: string;
}

export interface SuzuriMerchandiseResponse {
  success: boolean;
  message?: string;
  product_url?: string;
  product_id?: number;
  product_title?: string;
  error?: string;
}

export interface SuzuriApiItem {
  id: number;
  name: string;
  description?: string;
  base_price?: number;
}

export interface SuzuriItemsResponse {
  success: boolean;
  items: SuzuriApiItem[];
  error?: string;
}

/**
 * SUZURI API クライアント
 */
export class SuzuriApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = AISHA_API_BASE;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('token');
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  /**
   * SUZURI で利用可能なアイテム一覧を取得
   */
  async getAvailableItems(): Promise<SuzuriItemsResponse> {
    return this.makeRequest<SuzuriItemsResponse>('/suzuri/items/');
  }

  /**
   * 生成画像からグッズを作成
   */
  async createMerchandise(data: SuzuriMerchandiseRequest): Promise<SuzuriMerchandiseResponse> {
    return this.makeRequest<SuzuriMerchandiseResponse>('/suzuri/merchandise/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * ユーザーの作成済み商品一覧を取得
   */
  async getUserProducts(page: number = 1, perPage: number = 20) {
    return this.makeRequest(`/suzuri/products/?page=${page}&per_page=${perPage}`);
  }

  /**
   * 商品詳細を取得
   */
  async getProductDetail(productId: number) {
    return this.makeRequest(`/suzuri/products/${productId}/`);
  }
}

// シングルトンインスタンス
export const suzuriApiClient = new SuzuriApiClient();
