import axios from 'axios';
import { GeneratedImage } from '@/types';
import { keysToCamelCase } from '@/utils/caseConverter';

// APIエンドポイントのベースURL
const API_BASE = `${import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api'}/image-expansion/`;

// アンカーポジションの型定義
export type AnchorPosition =
  | 'top-left' | 'top-center' | 'top-right'
  | 'mid-left' | 'center' | 'mid-right'
  | 'bottom-left' | 'bottom-center' | 'bottom-right';

// リクエストパラメータの型定義
interface ImageExpansionRequest {
  image_id: string;
  anchor_position: AnchorPosition;
  user_id: string;
}

// レスポンスの型定義
interface ImageExpansionResponse {
  success: boolean;
  message: string;
  expanded_image: any; // GeneratedImageの形式
  original_image_id: string;
}

/**
 * 画像拡張API呼び出し
 * @param imageId 拡張する画像のID
 * @param anchorPosition アンカーポジション
 * @param userId ユーザーID
 * @param onError エラーハンドラー
 * @returns 拡張された画像のデータ
 */
export const expandImage = async (
  imageId: string,
  anchorPosition: AnchorPosition,
  userId: string,
  onError?: (error: unknown) => void,
): Promise<GeneratedImage | null> => {
  try {
    const requestData: ImageExpansionRequest = {
      image_id: imageId,
      anchor_position: anchorPosition,
      user_id: userId,
    };

    console.log('画像拡張API呼び出し:', requestData);

    const response = await axios.post(API_BASE, requestData);
    
    console.log('画像拡張APIレスポンス:', response.data);

    if (!response.data.success) {
      throw new Error(response.data.message || '画像拡張に失敗しました');
    }

    // レスポンスをキャメルケースに変換
    const expandedImageData = keysToCamelCase(response.data.expanded_image);
    
    // timestampをDateオブジェクトに変換
    const expandedImage: GeneratedImage = {
      ...expandedImageData,
      timestamp: new Date(expandedImageData.timestamp),
      isSavedToLibrary: false, // 拡張画像は明示的にライブラリ保存なしに設定
    };

    console.log('拡張画像データ:', expandedImage);

    return expandedImage;
  } catch (err: any) {
    console.error('画像拡張API実行失敗:', err);
    
    let errorMessage = '画像拡張中にエラーが発生しました';
    
    if (err.response?.data?.error) {
      errorMessage = err.response.data.error;
    } else if (err.response?.data?.details) {
      errorMessage = `バリデーションエラー: ${JSON.stringify(err.response.data.details)}`;
    } else if (err.message) {
      errorMessage = err.message;
    }

    onError?.(new Error(errorMessage));
    return null;
  }
}; 