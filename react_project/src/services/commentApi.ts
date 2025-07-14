import { Comment } from '../types';
import { AISHA_API_BASE } from '../constants';

const API_BASE_URL = AISHA_API_BASE;

export interface CommentCreateRequest {
  user_id: string;
  user_name: string;
  content: string;
}

export interface LikeToggleRequest {
  user_id: string;
}

export interface LikeToggleResponse {
  message: string;
  liked: boolean;
  like_count: number;
}

export interface LikeStatusResponse {
  liked: boolean;
  like_count: number;
}

class CommentApiService {
  /**
   * frontend_idからlibrary_idを取得する
   */
  async getLibraryIdFromFrontendId(frontendId: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/timeline/?user_id=200120`);
    if (!response.ok) {
      throw new Error('タイムライン取得に失敗しました');
    }
    
    const libraries = await response.json();
    const library = libraries.find((lib: any) => lib.id === frontendId);
    
    if (!library) {
      throw new Error('ライブラリが見つかりません');
    }
    
    // LibrarySerializerから実際のUUIDを取得するために別のAPIを使用する
    const libraryResponse = await fetch(`${API_BASE_URL}/timeline/public/`);
    if (!libraryResponse.ok) {
      throw new Error('公開タイムライン取得に失敗しました');
    }
    
    const publicLibraries = await libraryResponse.json();
    const publicLibrary = publicLibraries.find((lib: any) => lib.id === frontendId);
    
    if (!publicLibrary) {
      throw new Error('公開ライブラリが見つかりません');
    }
    
    // バックエンドAPIを使ってfrontend_idからUUIDを取得
    const uuidResponse = await fetch(`${API_BASE_URL}/timeline/${frontendId}/?user_id=200120`);
    if (!uuidResponse.ok) {
      throw new Error('ライブラリUUID取得に失敗しました');
    }
    
    const libraryData = await uuidResponse.json();
    return libraryData.library_uuid || frontendId; // フォールバック
  }

  /**
   * ライブラリ画像のコメント一覧を取得
   */
  async getComments(frontendId: string): Promise<Comment[]> {
    // 正しいURL構造を使用
    const response = await fetch(`${API_BASE_URL}/timeline/${frontendId}/comments/`);
    
    if (!response.ok) {
      throw new Error(`コメント取得に失敗しました: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * コメントを作成
   */
  async createComment(frontendId: string, commentData: CommentCreateRequest): Promise<Comment> {
    const response = await fetch(`${API_BASE_URL}/timeline/${frontendId}/comments/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(commentData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `コメント作成に失敗しました: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * コメントを削除
   */
  async deleteComment(frontendId: string, commentId: string, userId: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/timeline/${frontendId}/comments/${commentId}/?user_id=${userId}`,
      {
        method: 'DELETE',
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `コメント削除に失敗しました: ${response.statusText}`);
    }
  }

  /**
   * いいねをトグル（いいね/いいね解除）
   */
  async toggleLike(frontendId: string, likeData: LikeToggleRequest): Promise<LikeToggleResponse> {
    const response = await fetch(`${API_BASE_URL}/timeline/${frontendId}/like/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(likeData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `いいね処理に失敗しました: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * いいね状態を取得
   */
  async getLikeStatus(frontendId: string, userId?: string): Promise<LikeStatusResponse> {
    const params = userId ? `?user_id=${userId}` : '';
    const response = await fetch(`${API_BASE_URL}/timeline/${frontendId}/like/status/${params}`);
    
    if (!response.ok) {
      throw new Error(`いいね状態取得に失敗しました: ${response.statusText}`);
    }
    
    return response.json();
  }
}

export const commentApiService = new CommentApiService();