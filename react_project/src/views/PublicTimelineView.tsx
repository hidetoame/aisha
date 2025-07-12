
import React from 'react';
import { GeneratedImage, User } from '../types';
import { PhotoIcon, UserCircleIcon, CalendarDaysIcon, SparklesIcon } from '../components/icons/HeroIcons';

interface PublicTimelineViewProps {
  publicImages: GeneratedImage[];
  currentUser: User | null; // To potentially show different actions if user is logged in
}

const PublicTimelineView: React.FC<PublicTimelineViewProps> = ({ publicImages, currentUser }) => {
  if (publicImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 p-8">
        <PhotoIcon className="w-24 h-24 mb-6" />
        <h2 className="text-2xl font-semibold text-gray-400 mb-2">公開タイムラインはまだ空です</h2>
        <p className="text-lg">ユーザーが画像を公開すると、ここに表示されます。</p>
        {!currentUser && <p className="mt-4 text-sm">ログインして、あなたも画像を生成・公開してみませんか？</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
       <h1 className="text-3xl font-bold text-indigo-400 mb-8 text-center">公開タイムライン</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {publicImages.map((image) => (
          <div key={image.id} className="bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="aspect-video bg-gray-700/50 flex items-center justify-center overflow-hidden">
              <img 
                src={image.url} 
                alt={image.displayPrompt} 
                className="w-full h-full object-cover" // Changed to object-cover for better fill
              />
            </div>
            <div className="p-4 flex flex-col flex-grow">
              <div className="flex-grow space-y-2 mb-3">
                {image.menuName && (
                  <div className="flex items-center text-sm text-indigo-300">
                    <SparklesIcon className="w-4 h-4 mr-1.5 flex-shrink-0" />
                    <span>{image.menuName}</span>
                  </div>
                )}
                <p className="text-sm text-gray-300 leading-relaxed line-clamp-2" title={image.displayPrompt}>
                  {image.displayPrompt}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
                <div className="flex items-center">
                  <UserCircleIcon className="w-4 h-4 mr-1" />
                  <span>{image.authorName || '匿名ユーザー'}</span>
                </div>
                <div className="flex items-center">
                  <CalendarDaysIcon className="w-4 h-4 mr-1" />
                  <span>{new Date(image.timestamp).toLocaleDateString('ja-JP')}</span>
                </div>
              </div>
              {/* Future: Add like/comment/save buttons if currentUser is present */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PublicTimelineView;
