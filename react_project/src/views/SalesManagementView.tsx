import React, { useState, useEffect } from 'react';
import { getMonthlySummary, getMonthlyDetails, MonthlySummary, MonthlyDetail } from '../services/api/sales-management';
import MonthlySummaryList from '../components/panels/MonthlySummaryList';
import MonthlyDetailsList from '../components/panels/MonthlyDetailsList';

const SalesManagementView: React.FC = () => {
  const [summaries, setSummaries] = useState<MonthlySummary[]>([]);
  const [details, setDetails] = useState<MonthlyDetail[]>([]);
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<'succeeded' | 'pending'>('succeeded');
  const [error, setError] = useState<string | null>(null);

  // 月別集計を読み込み
  const loadMonthlySummary = async () => {
    try {
      setIsLoadingSummary(true);
      setError(null);
      const data = await getMonthlySummary();
      setSummaries(data);
    } catch (err) {
      console.error('月別集計取得エラー:', err);
      setError('月別集計の取得に失敗しました');
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // 月別詳細を読み込み
  const loadMonthlyDetails = async (year: number, month: number, status: 'succeeded' | 'pending') => {
    try {
      setIsLoadingDetails(true);
      setError(null);
      const data = await getMonthlyDetails({
        year: year.toString(),
        month: month.toString(),
        status
      });
      setDetails(data);
    } catch (err) {
      console.error('月別詳細取得エラー:', err);
      setError('月別詳細の取得に失敗しました');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // 詳細表示
  const handleViewDetails = (year: number, month: number) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    setStatusFilter('succeeded'); // デフォルトは成功
    loadMonthlyDetails(year, month, 'succeeded');
  };

  // ステータスフィルター変更
  const handleStatusFilterChange = (status: 'succeeded' | 'pending') => {
    if (selectedYear && selectedMonth) {
      setStatusFilter(status);
      loadMonthlyDetails(selectedYear, selectedMonth, status);
    }
  };

  // 戻る
  const handleBack = () => {
    setSelectedYear(null);
    setSelectedMonth(null);
    setDetails([]);
    setStatusFilter('succeeded');
  };

  // 初期読み込み
  useEffect(() => {
    loadMonthlySummary();
  }, []);

  return (
    <div className="min-h-screen bg-gray-800">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-indigo-300">売上管理</h1>
          <p className="mt-2 text-gray-400">
            チャージ履歴、クレジット消費履歴、月別レポートなどの機能。
          </p>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="mb-6 bg-red-900 border border-red-700 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-200">エラー</h3>
                <div className="mt-2 text-sm text-red-300">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* メインコンテンツ */}
        {selectedYear && selectedMonth ? (
          <MonthlyDetailsList
            details={details}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            statusFilter={statusFilter}
            onStatusFilterChange={handleStatusFilterChange}
            onBack={handleBack}
            isLoading={isLoadingDetails}
          />
        ) : (
          <MonthlySummaryList
            summaries={summaries}
            onViewDetails={handleViewDetails}
            isLoading={isLoadingSummary}
          />
        )}
      </div>
    </div>
  );
};

export default SalesManagementView; 