'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/format';

// 차트 탭 타입
type ChartTab = 'pie' | 'bar' | 'line';

// 월 이동 헬퍼
function getMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });
}

// placeholder 리포트 데이터
const reportData = {
  totalExpense: 324500,
  categories: [
    { name: '식비', amount: 120000, icon: '🍱', color: '#3182F6' },
    { name: '교통', amount: 45000, icon: '🚇', color: '#34C759' },
    { name: '카페', amount: 38000, icon: '☕', color: '#FF9500' },
    { name: '쇼핑', amount: 80000, icon: '🛍️', color: '#FF3B30' },
    { name: '기타', amount: 41500, icon: '📌', color: '#8B95A1' },
  ],
};

const chartTabs: { id: ChartTab; label: string }[] = [
  { id: 'pie', label: '파이' },
  { id: 'bar', label: '막대' },
  { id: 'line', label: '라인' },
];

export default function ReportPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<ChartTab>('pie');

  // 이전 달로 이동
  const goToPrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  // 다음 달로 이동
  const goToNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      {/* 상단 헤더 */}
      <div className="bg-white px-5 pt-6 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">지출 리포트</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* 월 선택기 */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              aria-label="이전 달"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z" clipRule="evenodd" />
              </svg>
            </button>
            <span className="text-base font-semibold text-gray-900">
              {getMonthLabel(year, month)}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500"
              aria-label="다음 달"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </section>

        {/* 총 지출 요약 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">총 지출</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(reportData.totalExpense)}
          </p>
        </section>

        {/* 차트 영역 — 탭 전환 */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* 탭 헤더 */}
          <div className="flex border-b border-gray-100">
            {chartTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-[#3182F6] border-b-2 border-[#3182F6]'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 차트 placeholder 영역 */}
          <div className="flex items-center justify-center h-56 text-gray-300">
            <div className="text-center">
              <p className="text-4xl mb-2">
                {activeTab === 'pie' ? '🥧' : activeTab === 'bar' ? '📊' : '📈'}
              </p>
              <p className="text-sm">
                {activeTab === 'pie' ? '파이 차트' : activeTab === 'bar' ? '막대 차트' : '라인 차트'} 준비 중
              </p>
            </div>
          </div>
        </section>

        {/* 카테고리별 지출 목록 */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <h2 className="px-5 pt-4 pb-2 text-sm font-semibold text-gray-700">
            카테고리별 지출
          </h2>
          <ul className="divide-y divide-gray-50">
            {reportData.categories.map((cat) => {
              const percent = Math.round((cat.amount / reportData.totalExpense) * 100);
              return (
                <li key={cat.name} className="px-5 py-3">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-xl">{cat.icon}</span>
                    <span className="flex-1 text-sm font-medium text-gray-900">{cat.name}</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {formatCurrency(cat.amount)}
                    </span>
                    <span className="text-xs text-gray-400 w-8 text-right">{percent}%</span>
                  </div>
                  {/* 카테고리별 진행바 */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-8">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${percent}%`, backgroundColor: cat.color }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
