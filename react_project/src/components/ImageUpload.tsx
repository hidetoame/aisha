import {
  useState,
  useCallback,
  ChangeEvent,
  useImperativeHandle,
  forwardRef,
  useRef,
  useEffect,
  useMemo,
} from 'react';
import { PhotoIcon } from './icons/HeroIcons';
import { getImageDimensions } from '@/utils/imageResize';

interface ImageUploadProps {
  onImageSelect: (file: File | null) => void;
  label?: string;
  uploadedFile?: File | null;
  initialPreviewUrl?: string;
  showDeleteButton?: boolean; // ×ボタンを表示するかどうか
}

export interface ImageUploadRef {
  reset: () => void;
}

export const ImageUpload = forwardRef<ImageUploadRef, ImageUploadProps>(
  ({ onImageSelect, label = '画像アップロード (任意)', uploadedFile, initialPreviewUrl, showDeleteButton = false }, ref) => {
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
    const [willBeResized, setWillBeResized] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const previewUrl = useMemo(() => {
      if (file) {
        return URL.createObjectURL(file);
      }
      return initialPreviewUrl || null;
    }, [file, initialPreviewUrl]);

    useEffect(() => {
      if (uploadedFile) {
        setFile(uploadedFile);
        setFileName(uploadedFile.name);
      }
    }, [uploadedFile]);

    useEffect(() => {
      return () => {
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
      };
    }, [previewUrl]);

    const handleFileChange = useCallback(
      async (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
          setFile(selectedFile);
          setFileName(selectedFile.name);
          
          try {
            // 画像の実際のサイズを取得
            const dimensions = await getImageDimensions(selectedFile);
            setImageDimensions(dimensions);
            
            // リサイズが必要かチェック（長辺2000px以上の場合）
            const longSide = Math.max(dimensions.width, dimensions.height);
            setWillBeResized(longSide > 2000);
            
            console.log(`🖼️ アップロード画像: ${dimensions.width}x${dimensions.height}${longSide > 2000 ? ' (リサイズ予定)' : ''}`);
          } catch (error) {
            console.error('画像サイズ取得エラー:', error);
            setImageDimensions(null);
            setWillBeResized(false);
          }
          
          onImageSelect(selectedFile);
        } else {
          setFile(null);
          setFileName(null);
          setImageDimensions(null);
          setWillBeResized(false);
          onImageSelect(null);
        }
      },
      [onImageSelect],
    );

    const handleDelete = useCallback(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setFile(null);
      setFileName(null);
      setImageDimensions(null);
      setWillBeResized(false);
      onImageSelect(null);
    }, [onImageSelect]);

    useImperativeHandle(ref, () => ({
      reset: () => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setFile(null);
        setFileName(null);
        setImageDimensions(null);
        setWillBeResized(false);
      },
    }));

    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-300 mb-1">
          {label}
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md hover:border-indigo-500 transition-colors">
          <div className="space-y-1 text-center">
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="プレビュー"
                  className="mx-auto h-32 w-auto rounded-md object-contain"
                />
                {showDeleteButton && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors"
                    title="画像を削除"
                  >
                    ×
                  </button>
                )}
              </div>
            ) : (
              <PhotoIcon className="mx-auto h-12 w-12 text-gray-500" />
            )}
            <div className="flex text-sm text-gray-500">
              <label
                htmlFor={`file-upload-${label.replace(/\s/g, '-')}`}
                className="relative cursor-pointer bg-gray-700 rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-800 focus-within:ring-indigo-500 px-3 py-1"
              >
                <span>ファイルをアップロード</span>
                <input
                  id={`file-upload-${label.replace(/\s/g, '-')}`}
                  name="file-upload"
                  type="file"
                  className="sr-only"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </label>
              <p className="pl-1">またはドラッグ＆ドロップ</p>
            </div>
            {fileName ? (
              <div className="text-xs text-gray-400 mt-1 space-y-1">
                <p>{fileName}</p>
                {imageDimensions && (
                  <p className="text-xs text-gray-500">
                    サイズ: {imageDimensions.width} × {imageDimensions.height}
                  </p>
                )}
                {willBeResized && (
                  <p className="text-xs text-yellow-400">
                    ⚠️ 大きな画像のため、生成時に自動リサイズされます
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">PNG, JPG, GIF 最大10MB</p>
            )}
            {file && (
              <button
                type="button"
                onClick={() => {
                  if (fileInputRef.current) fileInputRef.current.value = '';
                  setFile(null);
                  setFileName(null);
                  setImageDimensions(null);
                  setWillBeResized(false);
                  onImageSelect(null);
                }}
                className="mt-2 text-xs text-red-400 hover:text-red-300"
              >
                画像をクリア
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);
