import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPublicImage, PublicImageData } from '@/services/api/public-share';
import { fetchPublicComments, postPublicComment, PublicComment } from '@/services/api/public-comments';
import { fetchGoodsByImage, PublicGoods } from '@/services/api/public-goods';
import { fetchGoodsPrices, GoodsPrice } from '@/services/api/public-goods-prices';
import { ArrowPathIcon, ChatBubbleLeftIcon, UserCircleIcon, ShoppingBagIcon } from '../components/icons/HeroIcons';

const PublicShareView: React.FC = () => {
  const { frontendId } = useParams<{ frontendId: string }>();
  const [imageData, setImageData] = useState<PublicImageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [goods, setGoods] = useState<PublicGoods[]>([]);
  const [goodsPrices, setGoodsPrices] = useState<Map<number, GoodsPrice>>(new Map());
  const [showGoods, setShowGoods] = useState(false);
  const [isLoadingGoods, setIsLoadingGoods] = useState(false);

  useEffect(() => {
    if (!frontendId) return;

    const loadPublicImage = async () => {
      setIsLoading(true);
      setError(null);
      
      const data = await fetchPublicImage(frontendId, (err) => {
        console.error('画像取得エラー:', err);
        setError('画像が見つかりません');
      });

      if (data) {
        setImageData(data);
        // コメントも取得
        const commentsData = await fetchPublicComments(frontendId);
        // 統合形式に変換（author_nameをuser_nameにマッピング）
        const unifiedComments = commentsData.map(comment => ({
          ...comment,
          user_name: comment.user_name || comment.author_name,
          is_guest: comment.is_guest !== undefined ? comment.is_guest : true
        }));
        setComments(unifiedComments);
        
        // グッズの数を取得（表示はしない）
        const goodsData = await fetchGoodsByImage(
          frontendId,
          (err) => console.error('グッズ取得エラー:', err)
        );
        setGoods(goodsData);
        
        // 価格情報を取得
        const pricesData = await fetchGoodsPrices(
          (err) => console.error('価格取得エラー:', err)
        );
        setGoodsPrices(pricesData);
      } else if (!error) {
        setError('画像が見つかりません');
      }
      
      setIsLoading(false);
    };

    loadPublicImage();
  }, [frontendId]);

  const handlePostComment = async () => {
    if (!newComment.trim() || !authorName.trim() || !frontendId) return;
    
    setIsPostingComment(true);
    const comment = await postPublicComment(
      frontendId,
      newComment.trim(),
      authorName.trim(),
      (err) => console.error('コメント投稿エラー:', err)
    );
    
    if (comment) {
      // 統合形式に変換
      const unifiedComment = {
        ...comment,
        user_name: comment.author_name,
        is_guest: true
      };
      setComments([unifiedComment, ...comments]);
      setNewComment('');
      // 名前は保持
    }
    setIsPostingComment(false);
  };

  // グッズを取得
  const loadGoods = async () => {
    if (!frontendId) return;
    
    setIsLoadingGoods(true);
    const goodsData = await fetchGoodsByImage(
      frontendId,
      (err) => console.error('グッズ取得エラー:', err)
    );
    setGoods(goodsData);
    setIsLoadingGoods(false);
  };

  // グッズボタンクリック
  const handleGoodsClick = () => {
    setShowGoods(!showGoods);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 animate-spin mx-auto text-blue-600" />
          <p className="mt-4 text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error || !imageData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            画像が見つかりません
          </h1>
          <p className="text-gray-600 mb-6">
            この画像は非公開に設定されているか、削除された可能性があります。
          </p>
          <Link 
            to="/"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            AISHAを試してみる
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">
              AISHA By MyGarage
              <span className="text-base ml-1">(β)</span>
            </h1>
            <Link 
              to="/"
              className="text-sm px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              AISHAを試してみる
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* 画像表示エリア */}
          <div className="relative bg-gray-100">
            <img 
              src={imageData.image_url}
              alt={imageData.menu_name || 'AI生成画像'}
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          </div>

          {/* 画像情報 */}
          <div className="p-6">

            {/* メタ情報 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {imageData.menu_name && (
                <div>
                  <span className="text-gray-600">使用メニュー: </span>
                  <span className="text-gray-800">{imageData.menu_name}</span>
                </div>
              )}
              
              {imageData.author_name && (
                <div>
                  <span className="text-gray-600">作成者: </span>
                  <span className="text-gray-800">{imageData.author_name}</span>
                </div>
              )}
              
              <div>
                <span className="text-gray-600">作成日: </span>
                <span className="text-gray-800">
                  {new Date(imageData.timestamp).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </div>

            {/* 評価表示 */}
            {imageData.rating && (
              <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100">
                {imageData.rating === 'good' ? '👍 Good' : '👎 Bad'}
              </div>
            )}
          </div>
        </div>

        {/* グッズセクション */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <button
            onClick={handleGoodsClick}
            className="w-full flex items-center justify-between text-lg font-semibold text-gray-800 hover:text-blue-600 transition-colors"
          >
            <div className="flex items-center">
              <ShoppingBagIcon className="w-5 h-5 mr-2" />
              グッズ ({goods.length})
            </div>
            <span className="text-sm text-gray-500">
              {showGoods ? '閉じる' : '表示'}
            </span>
          </button>
          
          {showGoods && (
            <div className="mt-4 border-t pt-4">
              {isLoadingGoods ? (
                <div className="text-center py-8">
                  <ArrowPathIcon className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                  <p className="mt-2 text-gray-600">グッズを読み込み中...</p>
                </div>
              ) : goods.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  この画像から作成されたグッズはまだありません
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {goods.map((item) => (
                    <a
                      key={item.id}
                      href={item.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <img
                        src={item.sample_image_url}
                        alt={item.product_title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="p-3">
                        <h4 className="font-medium text-gray-800 text-sm truncate">
                          {item.product_title}
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500">
                            {new Date(item.created_at).toLocaleDateString('ja-JP')}
                          </p>
                          {goodsPrices.has(item.item_id) && (
                            <p className="text-sm font-semibold text-gray-800">
                              ¥{goodsPrices.get(item.item_id)!.final_price.toLocaleString()}～
                            </p>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
              {goods.length > 0 && (
                <p className="text-xs text-gray-400 text-right mt-4">Created by SUZURI</p>
              )}
            </div>
          )}
        </div>

        {/* コメントセクション */}
        <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <ChatBubbleLeftIcon className="w-5 h-5 mr-2" />
            コメント ({comments.length})
          </h3>
          
          {/* コメント投稿フォーム */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="mb-3">
              <input
                type="text"
                placeholder="お名前"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                maxLength={50}
              />
            </div>
            <div className="mb-3">
              <textarea
                placeholder="コメントを入力..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={500}
              />
            </div>
            <button
              onClick={handlePostComment}
              disabled={!newComment.trim() || !authorName.trim() || isPostingComment}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isPostingComment ? '投稿中...' : 'コメントを投稿'}
            </button>
          </div>
          
          {/* コメントリスト */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">まだコメントはありません</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex items-start">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold mr-3 flex-shrink-0 ${
                      comment.is_guest ? 'bg-green-600' : 'bg-gray-600'
                    }`}>
                      {comment.is_guest ? 'G' : (comment.user_name || comment.author_name || '').charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="font-medium text-gray-800">
                          {comment.user_name || comment.author_name}
                          {comment.is_guest && <span className="text-gray-500 font-normal">（ゲストユーザー）</span>}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                          {new Date(comment.created_at).toLocaleString('ja-JP')}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 mb-4">
            この画像はAISHAで生成されました
          </p>
          <Link 
            to="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            AISHAで画像を生成する
          </Link>
        </div>
      </main>

      {/* フッター */}
      <footer className="mt-16 py-8 text-center text-sm text-gray-500">
        <p>&copy; 2024 AISHA. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default PublicShareView;