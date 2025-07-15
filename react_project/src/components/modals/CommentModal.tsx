import React, { useState, useEffect, useRef } from 'react';
import { GeneratedImage, Comment, User } from '../../types';
import { XMarkIcon, PaperAirplaneIcon } from '../icons/HeroIcons';
import { commentApiService } from '../../services/commentApi';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: GeneratedImage;
  currentUser: User | null;
  onCommentUpdate?: (imageId: string, newCommentCount: number) => void;
}

const CommentModal: React.FC<CommentModalProps> = ({ isOpen, onClose, image, currentUser, onCommentUpdate }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      console.log('CommentModal opened', { currentUser, imageId: image.id });
      loadComments();
    }
  }, [isOpen, image.id]);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadComments = async () => {
    try {
      setIsLoading(true);
      const data = await commentApiService.getComments(image.id);
      setComments(data);
    } catch (error) {
      console.error('Failed to load comments:', error);
      // フォールバック: 空の配列を設定
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submit comment clicked', { newComment, currentUser, imageId: image.id });
    
    if (!newComment.trim()) {
      console.log('Comment is empty');
      return;
    }
    
    if (!currentUser) {
      console.log('No current user');
      alert('ログインが必要です');
      return;
    }

    try {
      setIsLoading(true);
      console.log('Sending comment API request...');
      
      const newCommentData = await commentApiService.createComment(image.id, {
        user_id: currentUser.id,
        user_name: currentUser.name,
        content: newComment,
      });
      
      console.log('Comment created successfully:', newCommentData);
      setComments(prev => {
        const newComments = [...prev, newCommentData];
        // コメント数の更新を通知（新しい配列の長さを使用）
        if (onCommentUpdate) {
          onCommentUpdate(image.id, newComments.length);
        }
        return newComments;
      });
      setNewComment('');
    } catch (error) {
      console.error('Failed to submit comment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`コメントの投稿に失敗しました: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg w-full max-w-md h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <img 
              src={image.url} 
              alt={image.menuName || 'AI画像生成'}
              className="w-12 h-12 object-cover rounded-lg"
            />
            <div>
              <h3 className="text-white font-semibold text-sm">コメント</h3>
              <p className="text-gray-400 text-xs">{image.authorName || '匿名ユーザー'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Comments */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && comments.length === 0 ? (
            <div className="text-center text-gray-400">コメントを読み込み中...</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-gray-400">まだコメントがありません</div>
          ) : (
            <>
              {comments.map((comment) => (
                <div key={comment.id} className="flex">
                  <div className="flex-1 min-w-0">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-white font-semibold text-sm">{comment.user_name}</span>
                        <span className="text-gray-400 text-xs">{formatTime(comment.created_at)}</span>
                      </div>
                      <p className="text-gray-200 text-sm">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Comment Input */}
        {currentUser && (
          <form onSubmit={handleSubmitComment} className="p-4 border-t border-gray-700">
            <div className="flex space-x-3">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex-1 flex space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="コメントを入力..."
                  maxLength={500}
                  className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || isLoading}
                  className="bg-indigo-600 text-white rounded-lg px-3 py-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-right text-xs text-gray-400 mt-1">
              {newComment.length}/500
            </div>
          </form>
        )}
        
        {!currentUser && (
          <div className="p-4 border-t border-gray-700 text-center text-gray-400 text-sm">
            コメントするにはログインが必要です
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentModal;