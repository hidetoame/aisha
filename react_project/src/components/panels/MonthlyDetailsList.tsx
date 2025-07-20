import React from 'react';
import { MonthlyDetail } from '../../services/api/sales-management';

interface MonthlyDetailsListProps {
  details: MonthlyDetail[];
  selectedYear: number;
  selectedMonth: number;
  statusFilter: 'succeeded' | 'pending';
  onStatusFilterChange: (status: 'succeeded' | 'pending') => void;
  onBack: () => void;
  isLoading: boolean;
}

const MonthlyDetailsList: React.FC<MonthlyDetailsListProps> = ({
  details,
  selectedYear,
  selectedMonth,
  statusFilter,
  onStatusFilterChange,
  onBack,
  isLoading
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        <span className="ml-2 text-gray-400">読み込み中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            ← 戻る
          </button>
          <h2 className="text-2xl font-bold text-indigo-300">
            {selectedYear}年{selectedMonth}月 決済履歴
          </h2>
        </div>
        
        {/* ステータスフィルター */}
        <div className="flex space-x-2">
          <button
            onClick={() => onStatusFilterChange('succeeded')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'succeeded'
                ? 'bg-green-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            成功
          </button>
          <button
            onClick={() => onStatusFilterChange('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
            }`}
          >
            処理中
          </button>
        </div>
      </div>

      {/* 件数表示 */}
      <div className="text-sm text-gray-400">
        {details.length}件のレコード
      </div>

      {/* 詳細リスト */}
      {details.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          データがありません
        </div>
      ) : (
        <div className="bg-gray-700 rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-600">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    チャージ金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    クレジット
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    作成日時
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-700 divide-y divide-gray-600">
                {details.map((detail) => (
                  <tr key={detail.id} className="hover:bg-gray-600">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">
                      {detail.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                      <div>
                        <div className="font-medium">{detail.user_email}</div>
                        <div className="text-gray-400 text-xs">{detail.user_id}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                      ¥{detail.charge_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                      {detail.credit_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        detail.payment_status === 'succeeded'
                          ? 'bg-green-900 text-green-200'
                          : detail.payment_status === 'pending'
                          ? 'bg-orange-900 text-orange-200'
                          : 'bg-red-900 text-red-200'
                      }`}>
                        {detail.status_text}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {detail.created_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyDetailsList; 