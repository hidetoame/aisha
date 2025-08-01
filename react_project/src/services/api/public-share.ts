import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api'}/timeline`;

/**
 * 公開共有画像の詳細を取得（認証不要）
 */
export interface PublicImageData {
  frontend_id: string;
  image_url: string;
  display_prompt: string;
  menu_name: string | null;
  timestamp: string;
  rating: 'good' | 'bad' | null;
  author_name: string | null;
}

export const fetchPublicImage = async (
  frontendId: string,
  onError?: (error: unknown) => void
): Promise<PublicImageData | null> => {
  try {
    const response = await axios.get(`${API_BASE}/share/${frontendId}/`);
    return response.data;
  } catch (err) {
    console.error('公開画像取得API実行失敗', err);
    onError?.(err);
    return null;
  }
};