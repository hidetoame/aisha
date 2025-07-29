import React from 'react';
import { GeneratedImage, User } from '@/types';
import { SNS_OPTIONS, APP_NAME } from '@/constants';
import {
  LinkIcon,
  UserCircleIcon as ShareUserIcon,
  CalendarDaysIcon as ShareDateIcon,
  SparklesIcon as ShareMenuIcon,
  XMarkIcon as CloseIconMini,
} from '../icons/HeroIcons';
import { FacebookIcon, XIcon } from '../icons/SocialIcons';

interface ShareGeneratedImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: GeneratedImage;
  currentUser: User | null;
}

export const ShareGeneratedImageModal: React.FC<
  ShareGeneratedImageModalProps
> = ({ isOpen, onClose, image, currentUser }) => {
  const [publicImageUrl, setPublicImageUrl] = React.useState<string>(image.url);
  const [isUploading, setIsUploading] = React.useState<boolean>(false);

  React.useEffect(() => {
    console.log('🔍 Share Modal - Image URL:', image.url); // デバッグログ追加
    console.log('🔍 Share Modal - Is Localhost?:', image.url && (image.url.includes('localhost') || image.url.includes('127.0.0.1'))); // デバッグログ追加
    
    // ローカルホストURLの場合、GCSにアップロード
    const uploadImageIfNeeded = async () => {
      if (image.url && (image.url.includes('localhost') || image.url.includes('127.0.0.1'))) {
        console.log('🔍 Share Modal - Starting upload for localhost URL:', image.url); // デバッグログ追加
        setIsUploading(true);
        try {
          const apiBase = import.meta.env.VITE_AISHA_API_BASE || 'http://localhost:7999/api';
          const response = await fetch(`${apiBase}/images/upload/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: image.url,
              user_id: currentUser?.id || 'anonymous',
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('🔍 Share Modal - Upload successful:', data.public_url); // デバッグログ追加
            setPublicImageUrl(data.public_url);
          } else {
            const errorText = await response.text();
            console.error('画像アップロード失敗:', response.status, response.statusText, errorText);
            // アップロードに失敗してもローカルURLで続行
            console.log('🔍 Share Modal - Upload failed, using original URL:', image.url);
          }
        } catch (error) {
          console.error('画像アップロードエラー:', error);
          // アップロードに失敗してもローカルURLで続行
          console.log('🔍 Share Modal - Upload error, using original URL:', image.url);
        } finally {
          setIsUploading(false);
        }
      } else {
        console.log('🔍 Share Modal - No upload needed, using existing URL:', image.url); // デバッグログ追加
      }
    };

    if (isOpen) {
      uploadImageIfNeeded();
    }
  }, [isOpen, image.url, currentUser?.id]);

  if (!isOpen) return null;

  const shareBaseUrl = import.meta.env.VITE_AISHA_SHARE_BASE_URL || window.location.origin + window.location.pathname;
  const promptSummary =
    image.displayPrompt.length > 150
      ? image.displayPrompt.substring(0, 147) + '...'
      : image.displayPrompt;
  const sharePageUrl = `${shareBaseUrl}?share=true&user=${encodeURIComponent(currentUser?.name || image.authorName || 'ゲスト')}&date=${encodeURIComponent(new Date(image.timestamp).toISOString())}&image=${encodeURIComponent(publicImageUrl)}&prompt=${encodeURIComponent(promptSummary)}&menu=${encodeURIComponent(image.menuName || 'カスタム')}`;

  const handleSocialShare = (platformName: string) => {
    if (isUploading) {
      alert('画像をアップロード中です。しばらくお待ちください。');
      return;
    }

    let url = '';
    const text = encodeURIComponent(
      `${APP_NAME}で画像を生成しました！ ${image.menuName || ''} #マイガレージAISHA`,
    );

    switch (platformName) {
      case 'X':
        // X (Twitter) ではURLとテキストをシェア、画像はOGPで自動表示
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(sharePageUrl)}&text=${text}`;
        break;
      case 'Facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharePageUrl)}&quote=${text}`;
        break;
      case 'Copy URL':
        navigator.clipboard
          .writeText(sharePageUrl)
          .then(() => {
            alert('シェアページのURLをクリップボードにコピーしました！');
          })
          .catch((err) => console.error('URLのコピーに失敗しました: ', err));
        return;
    }
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[90] p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-700 shadow-2xl rounded-lg w-full max-w-3xl p-6 md:p-8 relative overflow-y-auto max-h-[90vh] custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700/70 transition-colors z-10"
          aria-label="シェアモーダルを閉じる"
        >
          <CloseIconMini className="w-7 h-7" />
        </button>

        <div className="flex items-center mb-6">
          <div>
            <h3 className="text-xl md:text-2xl font-semibold text-indigo-400">
              画像をシェア
            </h3>
            <p className="text-xs text-gray-400">{APP_NAME}</p>
          </div>
        </div>

        {publicImageUrl ? (
          <div className="mb-5 rounded-lg overflow-hidden shadow-lg bg-gray-700/40">
            <img
              src={publicImageUrl}
              alt={image.menuName || 'AI画像生成'}
              className="w-full h-auto max-h-[45vh] object-contain"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-sm">画像をアップロード中...</div>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-5 p-8 text-center bg-gray-700/40 rounded-lg">
            {isUploading ? (
              <p className="text-lg text-blue-400">
                画像をアップロード中...
              </p>
            ) : (
              <p className="text-lg text-red-400">
                画像プレビューが利用できません。
              </p>
            )}
          </div>
        )}

        <div className="space-y-2.5 text-xs md:text-sm mb-5">
          {image.menuName && (
            <div className="flex items-start">
              <ShareMenuIcon className="w-4 h-4 mr-2 mt-0.5 text-indigo-400 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-300">カテゴリ名称:</span>
                <p className="text-gray-200 ml-1 inline">{image.menuName}</p>
              </div>
            </div>
          )}
          <div className="flex items-center">
            <ShareUserIcon className="w-4 h-4 mr-2 text-indigo-400 flex-shrink-0" />
            <span className="font-medium text-gray-300">ユーザー:</span>
            <p className="text-gray-200 ml-1 inline">
              {currentUser?.name || image.authorName || 'ゲスト'}
            </p>
          </div>
          <div className="flex items-center">
            <ShareDateIcon className="w-4 h-4 mr-2 text-indigo-400 flex-shrink-0" />
            <span className="font-medium text-gray-300">日時:</span>
            <p className="text-gray-200 ml-1 inline">
              {new Date(image.timestamp).toLocaleString('ja-JP')}
            </p>
          </div>
        </div>

        <p className="text-sm text-gray-300 mb-3">共有方法を選択:</p>
        <div className="grid grid-cols-3 gap-2.5">
          {SNS_OPTIONS.map((opt) => (
            <button
              key={opt.name}
              onClick={() => handleSocialShare(opt.name)}
              className="flex flex-col items-center justify-center p-2.5 space-y-1 rounded-md bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white transition-all duration-150 ease-in-out text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
            >
              {opt.name === 'X' && <XIcon className="w-5 h-5 mb-0.5" />}
              {opt.name === 'Facebook' && (
                <FacebookIcon className="w-5 h-5 mb-0.5" />
              )}
              {opt.name === 'Copy URL' && (
                <LinkIcon className="w-5 h-5 mb-0.5" />
              )}
              <span>{opt.name === 'Copy URL' ? 'URLコピー' : opt.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
