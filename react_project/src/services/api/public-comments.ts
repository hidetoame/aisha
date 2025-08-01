import axios from 'axios';

const API_BASE = `${import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api'}/timeline`;

export interface PublicComment {
  id: string;
  frontend_id?: string;
  user_id?: string | null;
  user_name?: string;
  content: string;
  author_name?: string;
  created_at: string;
  updated_at?: string;
  is_guest?: boolean;
}

export const fetchPublicComments = async (
  frontendId: string,
  onError?: (error: unknown) => void
): Promise<PublicComment[]> => {
  try {
    const response = await axios.get<PublicComment[]>(`${API_BASE}/share/${frontendId}/comments/`);
    return response.data;
  } catch (error) {
    console.error('[PublicComments] コメント取得エラー:', error);
    if (onError) {
      onError(error);
    }
    return [];
  }
};

export const postPublicComment = async (
  frontendId: string,
  content: string,
  authorName: string,
  onError?: (error: unknown) => void
): Promise<PublicComment | null> => {
  try {
    const response = await axios.post<PublicComment>(`${API_BASE}/share/${frontendId}/comments/`, {
      content,
      author_name: authorName,
    });
    return response.data;
  } catch (error) {
    console.error('[PublicComments] コメント投稿エラー:', error);
    if (onError) {
      onError(error);
    }
    return null;
  }
};