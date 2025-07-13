import axios from 'axios';
import { GeneratedImage } from '@/types';
import { keysToCamelCase, keysToSnakeCase } from '@/utils/caseConverter';

const API_BASE = `${import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api'}/timeline`;

/**
 * タイムライン（旧ライブラリ）API関連のサービス関数
 * 生成された全画像の管理とライブラリフラグによる永続保存制御
 */

/**
 * ユーザーのタイムライン一覧を取得
 * @param userId ユーザーID
 * @param savedOnly ライブラリ保存済みのみ取得するか
 * @param onError エラーハンドラー
 */
export const fetchTimeline = async (
  userId: string,
  savedOnly: boolean = false,
  onError?: (error: unknown) => void,
): Promise<GeneratedImage[]> => {
  try {
    const response = await axios.get(`${API_BASE}/`, {
      params: { 
        user_id: userId,
        saved_only: savedOnly 
      },
    });
    
    // スネークケースからキャメルケースに変換
    const camelCaseData = keysToCamelCase(response.data);
    
    // timestampフィールドをDateオブジェクトに変換
    return camelCaseData.map((item: any) => ({
      ...item,
      timestamp: new Date(item.timestamp),
    }));
  } catch (err) {
    console.error('タイムライン取得API実行失敗', err);
    onError?.(err);
    return [];
  }
};

/**
 * タイムラインに画像を保存（生成時またはライブラリフラグ設定時）
 */
export const saveToTimeline = async (
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
    console.error('タイムライン保存API実行失敗', err);
    onError?.(err);
    return null;
  }
};

/**
 * タイムラインエントリを更新（ライブラリフラグ、評価・公開設定等）
 */
export const updateTimelineEntry = async (
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
    console.error('タイムライン更新API実行失敗', err);
    onError?.(err);
    return null;
  }
};

/**
 * タイムラインから削除
 */
export const deleteFromTimeline = async (
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
    console.error('タイムライン削除API実行失敗', err);
    onError?.(err);
    return false;
  }
};

/**
 * 公開タイムライン一覧を取得（公開画像表示用）
 */
export const fetchPublicTimeline = async (
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
    console.error('公開タイムライン取得API実行失敗', err);
    onError?.(err);
    return [];
  }
};

/**
 * タイムラインエントリの詳細を取得
 */
export const fetchTimelineDetail = async (
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
    console.error('タイムライン詳細取得API実行失敗', err);
    onError?.(err);
    return null;
  }
}; 