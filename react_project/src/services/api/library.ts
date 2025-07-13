import axios from 'axios';
import { GeneratedImage } from '@/types';
import { keysToCamelCase, keysToSnakeCase } from '@/utils/caseConverter';

const API_BASE = `${process.env.AISHA_API_BASE}/library`;

/**
 * ライブラリAPI関連のサービス関数
 */

/**
 * ユーザーのライブラリ一覧を取得
 */
export const fetchLibrary = async (
  userId: string,
  onError?: (error: unknown) => void,
): Promise<GeneratedImage[]> => {
  try {
    const response = await axios.get(`${API_BASE}/`, {
      params: { user_id: userId },
    });
    
    // スネークケースからキャメルケースに変換
    const camelCaseData = keysToCamelCase(response.data);
    
    // timestampフィールドをDateオブジェクトに変換
    return camelCaseData.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch (err) {
    console.error('ライブラリ取得API実行失敗', err);
    onError?.(err);
    return [];
  }
};

/**
 * ライブラリに画像を保存
 */
export const saveToLibrary = async (
  userId: string,
  imageData: GeneratedImage,
  onError?: (error: unknown) => void,
): Promise<GeneratedImage | null> => {
  try {
    // フロントエンドのGeneratedImage型をバックエンド形式に変換
    const backendData = {
      user_id: userId,
      id: imageData.id,
      url: imageData.url,
      displayPrompt: imageData.displayPrompt,
      menuName: imageData.menuName || null,
      usedFormData: imageData.usedFormData,
      timestamp: imageData.timestamp,
      rating: imageData.rating || null,
      isPublic: imageData.isPublic || false,
      authorName: imageData.authorName || null,
    };
    
    const response = await axios.post(`${API_BASE}/`, backendData);
    
    // レスポンスをキャメルケースに変換
    const camelCaseData = keysToCamelCase(response.data);
    
    // timestampをDateオブジェクトに変換
    return {
      ...camelCaseData,
      timestamp: new Date(camelCaseData.timestamp),
    };
  } catch (err) {
    console.error('ライブラリ保存API実行失敗', err);
    onError?.(err);
    return null;
  }
};

/**
 * ライブラリエントリを更新（評価・公開設定等）
 */
export const updateLibraryEntry = async (
  userId: string,
  frontendId: string,
  updateData: Partial<GeneratedImage>,
  onError?: (error: unknown) => void,
): Promise<GeneratedImage | null> => {
  try {
    // 更新データをバックエンド形式に変換
    const backendData = {
      user_id: userId,
      ...updateData,
    };
    
    const response = await axios.put(
      `${API_BASE}/${frontendId}/`,
      backendData
    );
    
    // レスポンスをキャメルケースに変換
    const camelCaseData = keysToCamelCase(response.data);
    
    // timestampをDateオブジェクトに変換
    return {
      ...camelCaseData,
      timestamp: new Date(camelCaseData.timestamp),
    };
  } catch (err) {
    console.error('ライブラリ更新API実行失敗', err);
    onError?.(err);
    return null;
  }
};

/**
 * ライブラリから削除
 */
export const deleteFromLibrary = async (
  userId: string,
  frontendId: string,
  onError?: (error: unknown) => void,
): Promise<boolean> => {
  try {
    await axios.delete(`${API_BASE}/${frontendId}/`, {
      params: { user_id: userId },
    });
    return true;
  } catch (err) {
    console.error('ライブラリ削除API実行失敗', err);
    onError?.(err);
    return false;
  }
};

/**
 * 公開ライブラリ一覧を取得（タイムライン用）
 */
export const fetchPublicLibrary = async (
  onError?: (error: unknown) => void,
): Promise<GeneratedImage[]> => {
  try {
    const response = await axios.get(`${API_BASE}/public/`);
    
    // スネークケースからキャメルケースに変換
    const camelCaseData = keysToCamelCase(response.data);
    
    // timestampフィールドをDateオブジェクトに変換
    return camelCaseData.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch (err) {
    console.error('公開ライブラリ取得API実行失敗', err);
    onError?.(err);
    return [];
  }
};

/**
 * ライブラリエントリの詳細を取得
 */
export const fetchLibraryDetail = async (
  userId: string,
  frontendId: string,
  onError?: (error: unknown) => void,
): Promise<GeneratedImage | null> => {
  try {
    const response = await axios.get(`${API_BASE}/${frontendId}/`, {
      params: { user_id: userId },
    });
    
    // レスポンスをキャメルケースに変換
    const camelCaseData = keysToCamelCase(response.data);
    
    // timestampをDateオブジェクトに変換
    return {
      ...camelCaseData,
      timestamp: new Date(camelCaseData.timestamp),
    };
  } catch (err) {
    console.error('ライブラリ詳細取得API実行失敗', err);
    onError?.(err);
    return null;
  }
}; 