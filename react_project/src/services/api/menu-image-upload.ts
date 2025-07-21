import { AISHA_API_BASE } from '@/constants';

export interface MenuImageUploadResponse {
  public_url: string;
  image_type: string;
  filename: string;
}

export interface MenuImageUploadError {
  error: string;
  details?: string;
}

/**
 * メニュー管理用の画像アップロードAPI
 */
export const uploadMenuImage = async (
  imageFile: File,
  imageType: 'sample_input' | 'sample_result'
): Promise<MenuImageUploadResponse> => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('image_type', imageType);

  const response = await fetch(`${AISHA_API_BASE}/menu-images/upload/`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData: MenuImageUploadError = await response.json();
    throw new Error(errorData.error || '画像のアップロードに失敗しました');
  }

  return response.json();
}; 