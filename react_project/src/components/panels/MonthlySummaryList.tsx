import React from 'react';
import { MonthlySummary } from '../../services/api/sales-management';

interface MonthlySummaryListProps {
  summaries: MonthlySummary[];
  onViewDetails: (year: number, month: number) => void;
  isLoading: boolean;
}

const MonthlySummaryList: React.FC<MonthlySummaryListProps> = ({
  summaries,
  onViewDetails,
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

  if (summaries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        データがありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {summaries.map((summary) => (
        <div
          key={`${summary.year}-${summary.month}`}
          className="bg-gray-700 rounded-lg shadow-md p-6 border border-gray-600"
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-indigo-300">
              {summary.month_label}
            </h3>
            <button
              onClick={() => onViewDetails(summary.year, summary.month)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              詳細
            </button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {summary.success_count}
              </div>
              <div className="text-sm text-gray-400">決済成功数</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {summary.success_credit_total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">成功クレジット総額</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">
                ¥{summary.success_point_total.toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">ポイント付与総額</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-400">
                {summary.pending_count}
              </div>
              <div className="text-sm text-gray-400">処理中数</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MonthlySummaryList; 