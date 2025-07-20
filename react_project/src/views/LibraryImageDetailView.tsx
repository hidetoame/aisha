import React, { useEffect, useState } from 'react';
import { GeneratedImage, MenuExecutionFormData, SuzuriItem, User, AspectRatio } from '../types';
import { GOODS_OPTIONS, EXTEND_IMAGE_CREDIT_COST } from '../constants';
import {
  XMarkIcon as CloseIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  ShoppingBagIcon,
  ArrowPathIcon,
  ShareIcon,
  SparklesIcon as ExtendIcon,
  ThumbUpIcon,
  ThumbDownIcon,
  EyeSlashIcon, // For public toggle
  EyeIcon as ViewIcon, // For public toggle
} from '@/components/icons/HeroIcons';
import { ShareGeneratedImageModal } from '@/components/modals/ShareGeneratedImageModal';
import { SuzuriMerchandiseModal } from '@/components/modals/SuzuriMerchandiseModal';
import { useCredits } from '@/contexts/CreditsContext';

interface LibraryImageDetailViewProps {
  image: GeneratedImage;
  onClose: () => void;
  onLoadOptions: (formData: MenuExecutionFormData, generatedImageUrl?: string) => void;
  onRateImage: (imageId: string, rating: 'good' | 'bad') => void;
  onDeleteImage: (imageId: string) => void;
  onCreateGoods: (item: SuzuriItem, image: GeneratedImage) => void;
  onExtendImage: (image: GeneratedImage) => void;
  onTogglePublicStatus: (imageId: string, isPublic: boolean) => void; // Added
  currentUser: User | null;
}

export const LibraryImageDetailView: React.FC<LibraryImageDetailViewProps> = ({
  image,
  onClose,
  onLoadOptions,
  onRateImage,
  onDeleteImage,
  onCreateGoods,
  onExtendImage,
  onTogglePublicStatus, // Added
  currentUser,
}) => {
  const credits = useCredits();

  const [showSuzuriModal, setShowSuzuriModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // SuzuriModalの表示状態を監視（デバッグ用）
  useEffect(() => {
    if (!showSuzuriModal) {
      // モーダルが閉じられた時の処理
    }
  }, [showSuzuriModal]);

  // コンポーネントのマウント・アンマウントを監視（デバッグ用）
  useEffect(() => {
    return () => {
      // クリーンアップ処理
    };
  }, []);
  const [showImageModal, setShowImageModal] = useState(false); // 画像拡大モーダル用
  const [isCurrentlyPublic, setIsCurrentlyPublic] = useState(image.isPublic);
  const [currentRating, setCurrentRating] = useState<
    'good' | 'bad' | undefined
  >(image.rating);

  useEffect(() => {
    setCurrentRating(image.rating);
  }, [image.rating]);

  const handleDownloadImage = async () => {
    try {
      // 外部URLの場合はfetchしてBlobとして取得
      const response = await fetch(image.url);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      
      // ファイル名を生成
      const extension = blob.type.includes('png') ? 'png' 
                      : blob.type.includes('jpeg') || blob.type.includes('jpg') ? 'jpg'
                      : blob.type.includes('webp') ? 'webp'
                      : 'jpg';
      
      link.download = `aisha_library_image_${image.id || Date.now()}.${extension}`;
      
      // ダウンロードを実行
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Blobの解放
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Download failed:', error);
      
      // フォールバック: 新しいタブで画像を開く
      const link = document.createElement('a');
      link.href = image.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // ユーザーに通知
      alert('直接ダウンロードに失敗しました。新しいタブで画像を開きました。右クリックで「名前を付けて画像を保存」を選択してください。');
    }
  };

  const ActionButton: React.FC<{
    onClick: () => void;
    icon: React.ReactNode;
    label: string;
    title?: string;
    className?: string;
    disabled?: boolean;
  }> = ({ onClick, icon, label, title, className, disabled }) => (
    <button
      onClick={onClick}
      title={title || label}
      disabled={disabled}
      className={`flex flex-col items-center justify-center p-2 space-y-1 rounded-md bg-gray-700 hover:bg-indigo-600 text-gray-300 hover:text-white transition-all duration-150 ease-in-out text-xs disabled:opacity-50 disabled:hover:bg-gray-700 ${className}`}
    >
      {icon}
      <span className="text-[10px] sm:text-xs">{label}</span>
    </button>
  );

  const handleGenerateWithThisImage = () => {
    
    // 現在の画像を使用してライブラリから生成パネルに画像をセット
    // applyRegenerateFormDataToMenuExePanel と同様の処理を行う
    const formData = image.usedFormData || {
      category: null,
      menu: null,
      image: null,
      additionalPromptForMyCar: '',
      additionalPromptForOthers: '',
      aspectRatio: AspectRatio.Original,
      promptVariables: [],
      inputType: 'upload' as const,
    };
    
    console.log('この画像で生成: formData =', formData);
    console.log('画像URL =', image.url);
    
    // 画像URLを渡してapplyRegenerateFormDataToMenuExePanelと同じ処理を実行
    onLoadOptions(formData, image.url);
    onClose();
  };

  const handleExtendGeneration = () => {
    onExtendImage(image);
    // onClose(); // 拡張方向選択モーダルを開くので詳細モーダルは閉じない
  };

  const handleDeleteFromLibrary = () => {
    if (
      window.confirm(
        'この画像をライブラリから本当に削除しますか？この操作は元に戻せません。',
      )
    ) {
      onDeleteImage(image.id);
      onClose();
    }
  };

  const handleTogglePublic = () => {
    const newPublicStatus = !isCurrentlyPublic;
    setIsCurrentlyPublic(newPublicStatus);
    onTogglePublicStatus(image.id, newPublicStatus);
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[70] p-4"
        onClick={() => {
          onClose();
        }}
      >
        <div
          className="bg-gray-850 border border-gray-700 p-4 md:p-6 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col md:flex-row gap-4 md:gap-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onClose();
            }}
            className="absolute top-3 right-3 text-gray-500 hover:text-white bg-gray-800/50 hover:bg-gray-700/80 p-1.5 rounded-full z-10"
            aria-label="詳細ビューを閉じる"
          >
            <CloseIcon className="w-6 h-6" />
          </button>

          <div className="md:w-2/3 flex-shrink-0 flex items-center justify-center bg-gray-900 rounded-lg overflow-hidden aspect-video md:aspect-auto md:max-h-[calc(90vh-6rem)]">
            <img
              src={image.url}
              alt={image.menuName || 'AI画像生成'}
              className="max-w-full max-h-full object-contain cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowImageModal(true)}
              title="クリックして拡大表示"
            />
          </div>

          <div className="md:w-1/3 flex flex-col space-y-3 overflow-y-auto custom-scrollbar pr-1 pb-1">
            <div>
              <h3 className="text-lg font-semibold text-indigo-300 mb-1">
                {image.menuName || 'カスタム生成'}
              </h3>
              <p className="text-xs text-gray-500">
                保存日: {new Date(image.timestamp).toLocaleString('ja-JP')}
              </p>
            </div>

            <div className="border-t border-gray-700 pt-3 space-y-2">
              <div className="flex items-center justify-start space-x-2">
                <p className="text-sm text-gray-300">評価:</p>
                <button
                  onClick={() => {
                    onRateImage(image.id, 'good');
                    setCurrentRating('good');
                  }}
                  title="良い"
                  className={`p-1.5 rounded-full hover:bg-gray-600 ${
                    currentRating === 'good'
                      ? 'text-green-400 ring-1 ring-green-500'
                      : 'text-gray-500 hover:text-green-300'
                  }`}
                  aria-pressed={currentRating === 'good'}
                >
                  <ThumbUpIcon className="w-5 h-5" />
                </button>

                <button
                  onClick={() => {
                    onRateImage(image.id, 'bad');
                    setCurrentRating('bad');
                  }}
                  title="悪い"
                  className={`p-1.5 rounded-full hover:bg-gray-600 ${
                    currentRating === 'bad'
                      ? 'text-red-400 ring-1 ring-red-500'
                      : 'text-gray-500 hover:text-red-300'
                  }`}
                  aria-pressed={currentRating === 'bad'}
                >
                  <ThumbDownIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2">
              <ActionButton
                onClick={handleGenerateWithThisImage}
                icon={<ArrowPathIcon className="w-5 h-5" />}
                label="この画像で生成"
                title="この画像と設定を再利用"
              />
              <ActionButton
                onClick={handleExtendGeneration}
                icon={<ExtendIcon className="w-5 h-5" />}
                label={`拡張 (${EXTEND_IMAGE_CREDIT_COST}C)`}
                title={`画像を拡張 (コスト: ${EXTEND_IMAGE_CREDIT_COST}C)`}
                disabled={credits < EXTEND_IMAGE_CREDIT_COST}
              />
              <ActionButton
                onClick={handleDownloadImage}
                icon={<ArrowDownTrayIcon className="w-5 h-5" />}
                label="DL"
                title="画像をダウンロード"
              />
            </div>

            <div className="border-t border-gray-700 mt-2 pt-2 grid grid-cols-3 gap-2">
              <ActionButton
                onClick={() => setShowShareModal(true)}
                icon={<ShareIcon className="w-5 h-5" />}
                label="シェア"
              />
              <ActionButton
                onClick={() => setShowSuzuriModal(true)}
                icon={<ShoppingBagIcon className="w-5 h-5" />}
                label="グッズ"
              />
              <ActionButton
                onClick={handleDeleteFromLibrary}
                icon={
                  <TrashIcon className="w-5 h-5 text-red-400/80 group-hover:text-red-400" />
                }
                label="削除"
                className="hover:bg-red-700/30 group"
              />
            </div>
            <div className="border-t border-gray-700 mt-2 pt-3">
              <button
                onClick={handleTogglePublic}
                title={isCurrentlyPublic ? '非公開にする' : '公開する'}
                className={`w-full flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                  isCurrentlyPublic
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                }`}
              >
                {isCurrentlyPublic ? (
                  <ViewIcon className="w-5 h-5 mr-2" />
                ) : (
                  <EyeSlashIcon className="w-5 h-5 mr-2" />
                )}
                {isCurrentlyPublic ? '公開中' : '非公開にする'}
              </button>
            </div>
          </div>
        </div>

        {/* SuzuriMerchandiseModal */}
        {showSuzuriModal && (
          <SuzuriMerchandiseModal
            isOpen={showSuzuriModal}
            onClose={() => {
              setShowSuzuriModal(false);
            }}
            image={image}
            currentUser={currentUser}
            onGoodsCreated={() => {
              // モーダルは閉じずに、プレビュー画面を表示させる（他のコンポーネントと同様）
            }}
          />
        )}
      </div>
      {showShareModal && (
        <ShareGeneratedImageModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          image={image}
          currentUser={currentUser}
        />
      )}
      
      {/* 画像拡大モーダル */}
      {showImageModal && (
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
              src={image.url}
              alt={image.menuName || 'Generated library image'}
              className="max-w-full max-h-full object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-4 right-4 bg-black/70 text-white p-3 rounded-lg">
              <p className="text-sm font-medium">{image.menuName || 'カスタム生成'}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
