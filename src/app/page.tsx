'use client';

import Link from 'next/link';
import { formatCurrency } from '@/lib/format';

// 오늘 날짜 한국어 표시용
function getTodayLabel(): string {
  const now = new Date();
  return now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });
}

// 오늘 지출 placeholder 데이터
const todayExpenses = [
  { id: 1, memo: '점심 식사', amount: 9500, category: '식비', icon: '🍱' },
  { id: 2, memo: '커피', amount: 4500, category: '카페', icon: '☕' },
  { id: 3, memo: '지하철', amount: 1400, category: '교통', icon: '🚇' },
];

// 이번 달 요약 placeholder 데이터
const monthlySummary = {
  totalExpense: 324500,
  budget: 500000,
  categories: [
    { name: '식비', amount: 120000, icon: '🍱' },
    { name: '교통', amount: 45000, icon: '🚇' },
    { name: '카페', amount: 38000, icon: '☕' },
  ],
};

export default function HomePage() {
  const todayLabel = getTodayLabel();
  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const budgetPercent = Math.round(
    (monthlySummary.totalExpense / monthlySummary.budget) * 100,
  );
  const currentMonth = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      {/* 상단 헤더 */}
      <div className="bg-white px-5 pt-6 pb-4 border-b border-gray-100">
        <p className="text-sm text-gray-400">{todayLabel}</p>
        <h1 className="text-xl font-bold text-gray-900 mt-0.5">오늘의 가계부</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* 이번 달 총 지출 요약 카드 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">{currentMonth} 총 지출</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(monthlySummary.totalExpense)}
          </p>

          {/* 예산 진행바 */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1.5">
              <span>예산 {formatCurrency(monthlySummary.budget)}</span>
              <span>{budgetPercent}% 사용</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#3182F6] rounded-full transition-all"
                style={{ width: `${Math.min(budgetPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* 카테고리별 상위 지출 */}
          <div className="mt-4 flex gap-2 flex-wrap">
            {monthlySummary.categories.map((cat) => (
              <div
                key={cat.name}
                className="flex items-center gap-1.5 bg-gray-50 rounded-xl px-3 py-1.5"
              >
                <span className="text-base">{cat.icon}</span>
                <span className="text-xs text-gray-600">{cat.name}</span>
                <span className="text-xs font-semibold text-gray-800">
                  {formatCurrency(cat.amount)}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 오늘 지출 목록 */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-gray-700">오늘 지출</h2>
            <span className="text-sm font-bold text-[#3182F6]">
              {formatCurrency(todayTotal)}
            </span>
          </div>

          {todayExpenses.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-gray-400">오늘 지출 내역이 없습니다</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {todayExpenses.map((expense) => (
                <li key={expense.id} className="flex items-center gap-3 px-5 py-3">
                  {/* 카테고리 아이콘 */}
                  <span className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                    {expense.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {expense.memo}
                    </p>
                    <p className="text-xs text-gray-400">{expense.category}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {formatCurrency(expense.amount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* 빠른 입력 FAB 버튼 (토스 블루) */}
      <Link
        href="/input"
        className="fixed bottom-20 right-5 md:bottom-6 md:right-6 w-14 h-14 bg-[#3182F6] rounded-full shadow-lg flex items-center justify-center text-white hover:bg-[#1B64DA] active:scale-95 transition-all z-40"
        aria-label="지출 입력"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-7 h-7"
        >
          <path
            fillRule="evenodd"
            d="M12 3.75a.75.75 0 01.75.75v6.75h6.75a.75.75 0 010 1.5h-6.75v6.75a.75.75 0 01-1.5 0v-6.75H4.5a.75.75 0 010-1.5h6.75V4.5a.75.75 0 01.75-.75z"
            clipRule="evenodd"
          />
        </svg>
      </Link>
    </div>
  );
}
