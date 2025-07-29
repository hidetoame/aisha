/**
 * 画像リサイズユーティリティ
 * 長辺を指定したピクセル数にリサイズし、アスペクト比を保持します
 */

export const resizeImage = (
  file: File,
  maxLongSide: number = 2000,
  quality: number = 1.0
): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      const { width, height } = img;
      
      // 既に小さい場合はそのまま返す
      if (width <= maxLongSide && height <= maxLongSide) {
        resolve(file);
        return;
      }

      // 長辺を基準にリサイズ比率を計算
      const longSide = Math.max(width, height);
      const ratio = maxLongSide / longSide;
      
      const newWidth = Math.round(width * ratio);
      const newHeight = Math.round(height * ratio);

      // キャンバスサイズを設定
      canvas.width = newWidth;
      canvas.height = newHeight;

      // 高品質なリサイズのための設定
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // 画像を描画
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Blobに変換
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }

          // 元のファイル名を保持してFileオブジェクトを作成
          const resizedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });

          // 画像リサイズ完了

          resolve(resizedFile);
        },
        file.type,
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // FileをData URLに変換して読み込み
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * 画像がリサイズが必要かどうかをチェック
 */
export const needsResize = async (file: File, maxLongSide: number = 2000): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const { width, height } = img;
      const longSide = Math.max(width, height);
      resolve(longSide > maxLongSide);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for size check'));
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file for size check'));
    };
    reader.readAsDataURL(file);
  });
};

/**
 * 画像の実際のサイズを取得
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};