import axios from 'axios';
import { camelToSnakeCase, keysToCamelCase } from '@/utils/caseConverter';
import {
  MenuExecutionFormData,
  MenuExecutionRequestParams,
  MenuExecutionResponseParams,
} from '@/types';

// APIエンドポイントのベースURL
const API_BASE = `${process.env.AISHA_API_BASE}/menus`;

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
  onError?: (error: unknown) => void,
): Promise<MenuExecutionResponseParams | null> => {
  const formData = new FormData();

  // 対象のparamsからmenuIdとimageを除外して処理（menuIdはURLに使うため・画像は別処理が必要なため）
  const { menuId, image, ...rest } = params;

  // すべてのparamsのkeyをスネークケースに変換してFormDataに追加
  if (image instanceof File) {
    formData.append('image', image, image.name);
  }
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
    return keysToCamelCase(response.data);
  } catch (err) {
    console.error('画像生成API実行失敗', err);
    onError?.(err);
    return null;
  }
};
