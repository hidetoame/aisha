
import React, { useEffect } from 'react';
import { SharePageParams } from '../types';
import { APP_NAME } from '../constants';
import { XMarkIcon, UserCircleIcon, CalendarDaysIcon, DocumentTextIcon, SparklesIcon } from '../components/icons/HeroIcons';


interface ShareViewProps {
  params: SharePageParams;
  onClose: () => void; // To navigate back or close the "view"
}

export const ShareView: React.FC<ShareViewProps> = ({ params, onClose }) => {
  useEffect(() => {
    // Twitter Cards と OGP メタタグを設定
    const setMetaTag = (property: string, content: string) => {
      let meta = document.querySelector(`meta[property="${property}"]`) || 
                  document.querySelector(`meta[name="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        if (property.startsWith('og:') || property.startsWith('twitter:')) {
          meta.setAttribute('property', property);
        } else {
          meta.setAttribute('name', property);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // 基本的なOGPタグ
    setMetaTag('og:title', `${APP_NAME} - ${params.sharedByUser}さんの生成画像`);
    setMetaTag('og:description', params.sharedPrompt || '画像生成アプリで作成された画像をシェア');
    setMetaTag('og:image', params.sharedImageUrl);
    setMetaTag('og:url', window.location.href);
    setMetaTag('og:type', 'website');

    // Twitter Cards
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', `${APP_NAME} - ${params.sharedByUser}さんの生成画像`);
    setMetaTag('twitter:description', params.sharedPrompt || '画像生成アプリで作成された画像をシェア');
    setMetaTag('twitter:image', params.sharedImageUrl);

    // ページタイトルも設定
    document.title = `${APP_NAME} - ${params.sharedByUser}さんの生成画像`;

    // クリーンアップ関数
    return () => {
      // ページを離れる時にメタタグをリセット
      document.title = APP_NAME;
    };
  }, [params]);

  return (
    <div className="fixed inset-0 bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 z-[100]">
      <div className="bg-gray-800 shadow-2xl rounded-lg w-full max-w-2xl p-6 md:p-8 relative overflow-y-auto max-h-[95vh] custom-scrollbar">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors"
          aria-label="共有ビューを閉じる"
        >
          <XMarkIcon className="w-7 h-7" />
        </button>

        <div className="flex items-center mb-6">
            <img src="https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/6d/23/22/6d2322a2-79d0-4009-6663-b46e08de5283/AppIcon-1x_U007epad-0-9-0-0-0-0-85-220-0.png/1200x600wa.png" alt="AISHA Logo" className="h-12 w-12 rounded-lg mr-4 object-contain" />
            <div>
                 <h1 className="text-2xl md:text-3xl font-bold text-indigo-400">{APP_NAME}</h1>
                 <p className="text-sm text-gray-400">共有された画像</p>
            </div>
        </div>

        {params.sharedImageUrl ? (
          <div className="mb-6 rounded-lg overflow-hidden shadow-lg bg-gray-700/50">
            <img 
              src={params.sharedImageUrl} 
              alt={params.sharedMenuName || "共有された画像"} 
              className="w-full h-auto max-h-[60vh] object-contain" 
            />
          </div>
        ) : (
          <div className="mb-6 p-8 text-center bg-gray-700/50 rounded-lg">
            <p className="text-xl text-red-400">画像が見つかりませんでした。</p>
          </div>
        )}

        <div className="space-y-3 text-sm md:text-base">
          {params.sharedMenuName && (
            <div className="flex items-start">
              <SparklesIcon className="w-5 h-5 mr-2 mt-0.5 text-indigo-400 flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-300">メニュー名:</span>
                <p className="text-gray-200 ml-1">{params.sharedMenuName}</p>
              </div>
            </div>
          )}
          {params.sharedPrompt && (
            <div className="flex items-start">
              <DocumentTextIcon className="w-5 h-5 mr-2 mt-0.5 text-indigo-400 flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-300">プロンプト概要:</span>
                <p className="text-gray-200 ml-1 break-words">{params.sharedPrompt}</p>
              </div>
            </div>
          )}
          <div className="flex items-center">
            <UserCircleIcon className="w-5 h-5 mr-2 text-indigo-400 flex-shrink-0" />
            <span className="font-semibold text-gray-300">共有者:</span>
            <p className="text-gray-200 ml-1">{params.sharedByUser}</p>
          </div>
          <div className="flex items-center">
            <CalendarDaysIcon className="w-5 h-5 mr-2 text-indigo-400 flex-shrink-0" />
            <span className="font-semibold text-gray-300">共有日時:</span>
            <p className="text-gray-200 ml-1">{new Date(params.sharedDate).toLocaleString('ja-JP')}</p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="mt-8 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-150 ease-in-out"
        >
          アプリに戻る
        </button>
         <p className="text-xs text-center text-gray-500 mt-4">
            これは共有専用の表示です。
        </p>
      </div>
    </div>
  );
};
