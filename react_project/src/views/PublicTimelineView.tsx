
import React, { useState, useEffect } from 'react';
import { GeneratedImage, User } from '../types';
import { PhotoIcon, UserCircleIcon, CalendarDaysIcon, SparklesIcon, ChatBubbleLeftIcon, HeartIcon, ShoppingBagIcon, XMarkIcon as CloseIcon } from '../components/icons/HeroIcons';
import CommentModal from '../components/modals/CommentModal';
import { SuzuriMerchandiseModal } from '../components/modals/SuzuriMerchandiseModal';
import { commentApiService } from '../services/commentApi';

interface PublicTimelineViewProps {
  publicImages: GeneratedImage[];
  currentUser: User | null; // To potentially show different actions if user is logged in
}

const PublicTimelineView: React.FC<PublicTimelineViewProps> = ({ publicImages, currentUser }) => {
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isGoodsModalOpen, setIsGoodsModalOpen] = useState(false);
  const [selectedImageForGoods, setSelectedImageForGoods] = useState<GeneratedImage | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageForExpand, setSelectedImageForExpand] = useState<GeneratedImage | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>(publicImages);

  // publicImagesが更新されたときにローカルstateも更新
  useEffect(() => {
    console.log('🔍 PublicTimelineView - publicImages更新:', publicImages.map(img => ({
      id: img.id,
      goods_creation_count: img.goods_creation_count,
      goodsCreationCount: img.goodsCreationCount,
      authorName: img.authorName
    })));
    setImages(publicImages);
  }, [publicImages]);

  const handleCommentClick = (image: GeneratedImage) => {
    setSelectedImage(image);
    setIsCommentModalOpen(true);
  };

  const handleGoodsClick = (image: GeneratedImage) => {
    setSelectedImageForGoods(image);
    setIsGoodsModalOpen(true);
  };

  const handleImageClick = (image: GeneratedImage) => {
    setSelectedImageForExpand(image);
    setShowImageModal(true);
  };

  const handleCommentUpdate = (imageId: string, newCommentCount: number) => {
    setImages(prevImages => 
      prevImages.map(prevImage => 
        prevImage.id === imageId 
          ? { ...prevImage, commentCount: newCommentCount }
          : prevImage
      )
    );
  };

  const handleGoodsUpdate = (imageId: string) => {
    console.log('🔄 handleGoodsUpdate 呼び出し - imageId:', imageId);
    
    // グッズ作成成功時にカウンタを+1
    setImages(prevImages => {
      const updated = prevImages.map(prevImage => 
        prevImage.id === imageId 
          ? { 
              ...prevImage, 
              goodsCreationCount: (prevImage.goodsCreationCount || prevImage.goods_creation_count || 0) + 1,
              goods_creation_count: (prevImage.goodsCreationCount || prevImage.goods_creation_count || 0) + 1 
            }
          : prevImage
      );
      
      const updatedImage = updated.find(img => img.id === imageId);
      if (updatedImage) {
        console.log('✅ カウンタ更新完了 - 新しいカウント:', updatedImage.goodsCreationCount || updatedImage.goods_creation_count);
      }
      
      return updated;
    });
  };

  const handleLikeClick = async (image: GeneratedImage) => {
    if (!currentUser) {
      // TODO: ログインを促すモーダル表示
      console.log('ログインが必要です');
      return;
    }

    try {
      const result = await commentApiService.toggleLike(image.id, {
        user_id: currentUser.id,
      });
      
      // UIを更新してリアルタイムでカウントを反映
      setImages(prevImages => 
        prevImages.map(prevImage => 
          prevImage.id === image.id 
            ? { ...prevImage, likeCount: result.like_count }
            : prevImage
        )
      );
    } catch (error) {
      console.error('いいね処理でエラーが発生しました:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-indigo-400 mb-8 text-center">公開タイムライン</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image) => (
          <div key={image.id} className="bg-gray-800 rounded-lg shadow-xl overflow-hidden flex flex-col">
            <div className="aspect-video bg-gray-700/50 flex items-center justify-center overflow-hidden">
              <img 
                src={image.url} 
                alt={image.menuName || 'AI画像生成'}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => handleImageClick(image)}
                title="クリックして拡大表示"
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
              </div>
              <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <UserCircleIcon className="w-4 h-4 mr-1" />
                    <span>{image.authorName || '匿名ユーザー'}</span>
                  </div>
                  <button 
                    onClick={() => handleCommentClick(image)}
                    className="flex items-center hover:text-blue-400 transition-colors"
                  >
                    <ChatBubbleLeftIcon className="w-4 h-4 mr-1" />
                    <span>{image.commentCount || 0}</span>
                  </button>
                  <button 
                    onClick={() => handleLikeClick(image)}
                    className="flex items-center hover:text-red-400 transition-colors"
                  >
                    <HeartIcon className="w-4 h-4 mr-1" />
                    <span>{image.likeCount || 0}</span>
                  </button>
                  <button 
                    onClick={() => handleGoodsClick(image)}
                    className={`flex items-center transition-colors ${
                      ((image.goodsCreationCount || image.goods_creation_count) || 0) > 0 
                        ? 'text-orange-400 hover:text-orange-500' 
                        : 'text-gray-500 hover:text-gray-600'
                    }`}
                  >
                    <ShoppingBagIcon className="w-4 h-4 mr-1" />
                    <span>{(image.goodsCreationCount || image.goods_creation_count) || 0}</span>
                  </button>
                </div>
                <div className="flex items-center">
                  <CalendarDaysIcon className="w-4 h-4 mr-1" />
                  <span>{new Date(image.timestamp).toLocaleDateString('ja-JP')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Comment Modal */}
      {selectedImage && (
        <CommentModal
          isOpen={isCommentModalOpen}
          onClose={() => setIsCommentModalOpen(false)}
          image={selectedImage}
          currentUser={currentUser}
          onCommentUpdate={handleCommentUpdate}
        />
      )}
      
      {/* Goods Modal */}
      {selectedImageForGoods && (
        <SuzuriMerchandiseModal
          isOpen={isGoodsModalOpen}
          onClose={() => setIsGoodsModalOpen(false)}
          image={selectedImageForGoods}
          currentUser={currentUser}
          onGoodsCreated={() => handleGoodsUpdate(selectedImageForGoods.id)}
        />
      )}
      
      {/* Image Expand Modal */}
      {showImageModal && selectedImageForExpand && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[80] p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-2 right-2 text-white bg-black/50 hover:bg-black/70 p-2 rounded-full z-10 transition-colors"
              aria-label="拡大表示を閉じる"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
            <img
              src={selectedImageForExpand.url}
              alt={selectedImageForExpand.menuName || 'AI画像生成'}
              className="max-w-full max-h-full object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-3 rounded-lg">
              <p className="text-sm font-medium">{selectedImageForExpand.menuName || '公開画像'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicTimelineView;
