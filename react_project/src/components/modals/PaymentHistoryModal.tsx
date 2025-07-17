import React, { useState, useEffect } from 'react';
import { User } from '@/types';
import { fetchPaymentHistory } from '@/services/api/credits';

interface PaymentHistoryEntry {
  id: number;
  charge_amount: number;
  credit_amount: number;
  payment_status: string;
  created_at: string;
  completed_at?: string;
}

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export const PaymentHistoryModal: React.FC<PaymentHistoryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (!currentUser) return; // ログインしていない場合は何もしない
    
    console.log('🔍 PaymentHistoryModal useEffect:', { isOpen, currentUser });
    if (isOpen && currentUser?.id) {
      fetchPaymentHistoryData(1);
    }
  }, [isOpen, currentUser]);

  const fetchPaymentHistoryData = async (page: number = 1) => {
    if (!currentUser?.id) {
      console.log('🔍 No currentUser or currentUser.id:', currentUser);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const offset = (page - 1) * itemsPerPage;
      const response = await fetchPaymentHistory(
        currentUser.id,
        itemsPerPage,
        offset,
        (err) => {
          console.error('決済履歴取得エラー:', err);
          setError('決済履歴の取得に失敗しました');
        }
      );
      
      if (response) {
        console.log('🔍 Payment history response:', response);
        const results = response.results || [];
        console.log('🔍 First history item:', results[0]);
        setPaymentHistory(results);
        setTotalCount(response.count || 0);
        setCurrentPage(page);
      }
    } catch (err: any) {
      console.error('決済履歴の取得に失敗:', err);
      setError('決済履歴の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) {
        return '日時不明';
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return '無効な日時';
      }
      return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Date formatting error:', error, 'dateString:', dateString);
      return '日時エラー';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'succeeded':
        return '成功';
      case 'pending':
        return '処理中';
      case 'failed':
        return '失敗';
      case 'canceled':
        return 'キャンセル';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'succeeded':
        return 'text-green-400';
      case 'pending':
        return 'text-yellow-400';
      case 'failed':
        return 'text-red-400';
      case 'canceled':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  if (!isOpen) return null;

  // デバッグログ
  console.log('🔍 PaymentHistoryModal render:', { currentUser, userId: currentUser?.id });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-indigo-400">
            決済履歴
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl"
          >
            ×
          </button>
        </div>

        {!currentUser ? (
          <div className="text-center py-8">
            <p className="text-gray-400">ユーザー情報が取得できません</p>
            <p className="text-gray-500 text-sm mt-2">
              ログインしてから再度お試しください
            </p>
          </div>
        ) : !currentUser.id ? (
          <div className="text-center py-8">
            <p className="text-gray-400">ユーザーIDが取得できません</p>
            <p className="text-gray-500 text-sm mt-2">
              ユーザー情報: {JSON.stringify(currentUser)}
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
            <span className="ml-3 text-gray-400">読み込み中...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => fetchPaymentHistoryData(currentPage)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
            >
              再試行
            </button>
          </div>
        ) : paymentHistory.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">決済履歴がありません</p>
          </div>
        ) : (
          <>
            {/* 履歴テーブル */}
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="space-y-3">
                {paymentHistory.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-gray-700 p-4 rounded-lg border border-gray-600"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-400 mb-1">決済日時</p>
                        <p className="text-gray-200 text-sm">
                          {formatDate(entry.created_at || entry.createdAt)}
                        </p>
                        {entry.completed_at && entry.completed_at !== entry.created_at && (
                          <p className="text-xs text-gray-500">
                            完了: {formatDate(entry.completed_at || entry.completedAt)}
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400 mb-1">金額</p>
                        <p className="text-gray-200 font-semibold">
                          ¥{(entry.charge_amount || entry.chargeAmount || 0).toLocaleString()}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400 mb-1">追加クレジット</p>
                        <p className="text-indigo-400 font-semibold">
                          +{(entry.credit_amount || entry.creditAmount || 0).toLocaleString()} クレジット
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400 mb-1">ステータス</p>
                        <p className={`font-semibold ${getStatusColor(entry.payment_status || entry.paymentStatus || 'unknown')}`}>
                          {getStatusText(entry.payment_status || entry.paymentStatus || 'unknown')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ページネーション */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-2 mt-4 pt-4 border-t border-gray-600">
                <button
                  onClick={() => fetchPaymentHistoryData(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded ${
                    currentPage === 1
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  前へ
                </button>
                
                <span className="text-gray-400 text-sm">
                  {currentPage} / {totalPages} ページ （全 {totalCount} 件）
                </span>
                
                <button
                  onClick={() => fetchPaymentHistoryData(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded ${
                    currentPage === totalPages
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  次へ
                </button>
              </div>
            )}
          </>
        )}

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full bg-gray-600 hover:bg-gray-700 text-gray-200 font-bold py-3 px-6 rounded-lg transition duration-150 ease-in-out"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
