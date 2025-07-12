import React from 'react';
import { GeneratedImage, User } from '@/types';
import { SNS_OPTIONS, APP_NAME } from '@/constants';
import {
  LinkIcon,
  UserCircleIcon as ShareUserIcon,
  CalendarDaysIcon as ShareDateIcon,
  DocumentTextIcon as SharePromptIcon,
  SparklesIcon as ShareMenuIcon,
  XMarkIcon as CloseIconMini,
} from '../icons/HeroIcons';
import { FacebookIcon, XIcon, InstagramIcon } from '../icons/SocialIcons';

interface ShareGeneratedImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: GeneratedImage;
  currentUser: User | null;
}

export const ShareGeneratedImageModal: React.FC<
  ShareGeneratedImageModalProps
> = ({ isOpen, onClose, image, currentUser }) => {
  if (!isOpen) return null;

  const shareBaseUrl = window.location.origin + window.location.pathname;
  const promptSummary =
    image.displayPrompt.length > 150
      ? image.displayPrompt.substring(0, 147) + '...'
      : image.displayPrompt;
  const sharePageUrl = `${shareBaseUrl}?share=true&user=${encodeURIComponent(currentUser?.name || image.authorName || 'ゲスト')}&date=${encodeURIComponent(new Date(image.timestamp).toISOString())}&image=${encodeURIComponent(image.url)}&prompt=${encodeURIComponent(promptSummary)}&menu=${encodeURIComponent(image.menuName || 'カスタム')}`;

  const handleSocialShare = (platformName: string) => {
    let url = '';
    const text = encodeURIComponent(
      `${APP_NAME}で画像を生成しました！ ${image.menuName || ''} #マイガレージAISHA`,
    );

    switch (platformName) {
      case 'X':
        url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(sharePageUrl)}&text=${text}`;
        break;
      case 'Facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(sharePageUrl)}&quote=${text}`;
        break;
      case 'Instagram':
        alert(
          'Instagramアプリを開き、ダウンロードした画像を投稿してください。\n画像URL: ' +
            image.url +
            '\n(Webからの直接投稿はサポートされていません)',
        );
        navigator.clipboard
          .writeText(`プロンプト: ${image.displayPrompt}\n#マイガレージAISHA`)
          .catch((err) => console.error('テキストのコピーに失敗: ', err));
        return;
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

        {image.url ? (
          <div className="mb-5 rounded-lg overflow-hidden shadow-lg bg-gray-700/40">
            <img
              src={image.url}
              alt={image.menuName || '生成された画像'}
              className="w-full h-auto max-h-[45vh] object-contain"
            />
          </div>
        ) : (
          <div className="mb-5 p-8 text-center bg-gray-700/40 rounded-lg">
            <p className="text-lg text-red-400">
              画像プレビューが利用できません。
            </p>
          </div>
        )}

        <div className="space-y-2.5 text-xs md:text-sm mb-5">
          {image.menuName && (
            <div className="flex items-start">
              <ShareMenuIcon className="w-4 h-4 mr-2 mt-0.5 text-indigo-400 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-300">メニュー:</span>
                <p className="text-gray-200 ml-1 inline">{image.menuName}</p>
              </div>
            </div>
          )}
          {image.displayPrompt && (
            <div className="flex items-start">
              <SharePromptIcon className="w-4 h-4 mr-2 mt-0.5 text-indigo-400 flex-shrink-0" />
              <div>
                <span className="font-medium text-gray-300">詳細:</span>
                <p
                  className="text-gray-200 ml-1 inline break-words"
                  title={image.displayPrompt}
                >
                  {promptSummary}
                </p>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
              {opt.name === 'Instagram' && (
                <InstagramIcon className="w-5 h-5 mb-0.5" />
              )}
              {opt.name === 'Copy URL' && (
                <LinkIcon className="w-5 h-5 mb-0.5" />
              )}
              <span>{opt.name === 'Copy URL' ? 'URLコピー' : opt.name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4 text-center">
          Instagramへの投稿は、画像をダウンロード後、アプリから手動で行ってください。
        </p>
      </div>
    </div>
  );
};
