import axios from 'axios';
import { camelToSnakeCase, keysToCamelCase } from '@/utils/caseConverter';
import { resizeImage } from '@/utils/imageResize';
import {
  MenuExecutionFormData,
  MenuExecutionRequestParams,
  MenuExecutionResponseParams,
} from '@/types';

// APIエンドポイントのベースURL
const API_BASE = `${import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api'}/menus`;

export const convertFormDataToRequestParams = (formData: MenuExecutionFormData): MenuExecutionRequestParams => {
  return {
    menuId: formData.menu!.id,
    image: formData.image ?? undefined,
    additionalPromptForMyCar: formData.additionalPromptForMyCar || undefined,
    additionalPromptForOthers: formData.additionalPromptForOthers || undefined,
    aspectRatio: formData.aspectRatio || undefined,
    promptVariables: formData.promptVariables?.length
      ? formData.promptVariables
      : undefined,
  };
}

export const executeMenu = async (
  params: MenuExecutionRequestParams,
  userId?: string,
  onError?: (error: unknown) => void,
): Promise<MenuExecutionResponseParams | null> => {
  const formData = new FormData();

  // 対象のparamsからmenuIdとimageを除外して処理（menuIdはURLに使うため・画像は別処理が必要なため）
  const { menuId, image, ...rest } = params;

  // user_idを追加
  if (userId) {
    formData.append('user_id', userId);
  }

  // 画像がある場合はリサイズしてからFormDataに追加
  if (image instanceof File) {
    try {
      console.log(`🖼️ 元画像サイズをチェック中: ${image.name}`);
      
      // 画像をリサイズ（長辺2000px以下に）
      const resizedImage = await resizeImage(image, 2000, 1.0);
      
      formData.append('image', resizedImage, resizedImage.name);
      console.log(`✅ 画像リサイズ完了: ${resizedImage.name}`);
    } catch (error) {
      console.error('❌ 画像リサイズエラー:', error);
      // リサイズに失敗した場合は元の画像を使用
      formData.append('image', image, image.name);
      console.log(`⚠️ 元画像をそのまま使用: ${image.name}`);
    }
  }

  // すべてのparamsのkeyをスネークケースに変換してFormDataに追加
  Object.entries(rest).forEach(([key, value]) => {
    if (value == null) return;

    const snakeKey = camelToSnakeCase(key);
    if (snakeKey === 'prompt_variables') {
      formData.append(snakeKey, JSON.stringify(value));
    } else {
      formData.append(snakeKey, value as any);
    }
  });

  try {
    const response = await axios.post(
      `${API_BASE}/${params.menuId}/execute/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    console.log('🔍 Raw API Response:', response.data); // デバッグログ追加
    const camelCaseData = keysToCamelCase(response.data);
    console.log('🔍 Camel Case Data:', camelCaseData); // デバッグログ追加
    return camelCaseData;
  } catch (err) {
    console.error('画像生成API実行失敗', err);
    onError?.(err);
    return null;
  }
};
