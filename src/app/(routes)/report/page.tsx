'use client';

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/format';
import CategoryPieChart from '@/components/charts/CategoryPieChart';
import MonthlyBarChart from '@/components/charts/MonthlyBarChart';
import TrendLineChart from '@/components/charts/TrendLineChart';
import CalendarView from '@/components/charts/CalendarView';

// 차트 탭 타입
type ChartTab = 'pie' | 'bar' | 'line' | 'calendar';

// 월 이동 헬퍼
function getMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });
}

// "YYYY-MM" 문자열 생성 헬퍼
function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

// 최근 N개월 "YYYY-MM" 배열 반환 (현재 월 포함, 내림차순)
function getRecentMonths(year: number, month: number, count: number): string[] {
  const result: string[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i++) {
    result.push(toMonthKey(y, m));
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return result; // 최신 → 오래된 순
}

const chartTabs: { id: ChartTab; label: string }[] = [
  { id: 'pie', label: '파이' },
  { id: 'bar', label: '막대' },
  { id: 'line', label: '라인' },
  { id: 'calendar', label: '캘린더' },
];

// 카테고리별 거래 포함 데이터 타입
interface CategoryWithTransactions {
  name: string;
  amount: number;
  color: string;
  icon: string;
  count: number;
  transactions: { date: string; memo: string; amount: number }[];
}

export default function ReportPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeTab, setActiveTab] = useState<ChartTab>('pie');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const currentMonthKey = toMonthKey(year, month);

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

  // 선택 월의 지출 거래 + 카테고리 조회
  const monthlyData = useLiveQuery(async () => {
    // 선택 월 범위 (YYYY-MM-DD 형식)
    const startDate = `${currentMonthKey}-01`;
    const endDate = `${currentMonthKey}-31`;

    // 선택 월 지출 거래
    const txns = await db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .filter((t) => t.type === 'expense')
      .toArray();

    // 카테고리 맵 생성
    const categories = await db.categories.toArray();
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    // 카테고리별 집계 (거래 목록 포함)
    const categoryGroups = new Map<number, CategoryWithTransactions>();
    for (const txn of txns) {
      const existing = categoryGroups.get(txn.categoryId);
      const cat = categoryMap.get(txn.categoryId);
      if (existing) {
        existing.amount += txn.amount;
        existing.count += 1;
        existing.transactions.push({ date: txn.date, memo: txn.memo, amount: txn.amount });
      } else {
        categoryGroups.set(txn.categoryId, {
          name: cat?.name ?? '알 수 없음',
          amount: txn.amount,
          color: cat?.color ?? '#94A3B8',
          icon: cat?.icon ?? '📌',
          count: 1,
          transactions: [{ date: txn.date, memo: txn.memo, amount: txn.amount }],
        });
      }
    }

    // 차트용 데이터: 0원 제외, 금액 내림차순, 거래는 날짜 내림차순
    const categoryData = Array.from(categoryGroups.values())
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .map((d) => ({
        ...d,
        transactions: d.transactions.sort((a, b) => b.date.localeCompare(a.date)),
      }));

    const totalExpense = categoryData.reduce((sum, d) => sum + d.amount, 0);

    return { categoryData, totalExpense };
  }, [currentMonthKey]);

  // 최근 6개월 월별 총 지출 집계 (막대/라인 차트용)
  const monthlyTrendData = useLiveQuery(async () => {
    // 최근 6개월 목록 (오래된 → 최신 순으로 반전)
    const months = getRecentMonths(year, month, 6).reverse();

    const result: { month: string; amount: number }[] = [];

    for (const monthKey of months) {
      const startDate = `${monthKey}-01`;
      const endDate = `${monthKey}-31`;

      const txns = await db.transactions
        .where('date')
        .between(startDate, endDate, true, true)
        .filter((t) => t.type === 'expense')
        .toArray();

      const total = txns.reduce((sum, t) => sum + t.amount, 0);
      result.push({ month: monthKey, amount: total });
    }

    return result;
  }, [year, month]);

  // 전월 지출 (증감 비교용)
  const prevMonthData = useLiveQuery(async () => {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonthKey = toMonthKey(prevYear, prevMonth);
    const startDate = `${prevMonthKey}-01`;
    const endDate = `${prevMonthKey}-31`;

    const txns = await db.transactions
      .where('date')
      .between(startDate, endDate, true, true)
      .filter((t) => t.type === 'expense')
      .toArray();

    return txns.reduce((sum, t) => sum + t.amount, 0);
  }, [year, month]);

  const totalExpense = monthlyData?.totalExpense ?? 0;
  const categoryData = monthlyData?.categoryData ?? [];
  const trendData = monthlyTrendData ?? [];

  // 전월 대비 증감 계산
  const prevTotal = prevMonthData ?? 0;
  const diff = totalExpense - prevTotal;
  const hasDiff = prevTotal > 0 || totalExpense > 0;

  // 차트용 데이터 (icon/count/transactions 제외한 단순 형태)
  const chartCategoryData = categoryData.map(({ name, amount, color, icon }) => ({
    name, amount, color, icon,
  }));

  const toggleCategory = (name: string) => {
    setExpandedCategory((prev) => (prev === name ? null : name));
  };

  return (
    <div className="min-h-screen pb-20 md:pb-6">
      {/* 상단 헤더 */}
      <div className="glass-header px-5 pt-6 pb-4">
        <h1 className="text-xl font-bold text-gray-900">지출 리포트</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* 월 선택기 */}
        <section className="glass-card p-4">
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

        {/* 총 지출 요약 + 전월 대비 증감 */}
        <section className="glass-card-heavy p-5">
          <p className="text-sm text-gray-500 mb-1">총 지출</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(totalExpense)}
          </p>
          {/* 전월 대비 증감 표시 — 데이터가 있을 때만 */}
          {hasDiff && (
            <p className={`text-sm mt-1.5 font-medium ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-500' : 'text-gray-400'}`}>
              {diff > 0 ? '↑' : diff < 0 ? '↓' : '–'}{' '}
              {diff !== 0
                ? `전월 대비 ${formatCurrency(Math.abs(diff))}`
                : '전월과 동일'}
            </p>
          )}
        </section>

        {/* 차트 영역 — 탭 전환 */}
        <section className="glass-card overflow-hidden">
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

          {/* 실제 차트 컴포넌트 */}
          <div className="p-4">
            {activeTab === 'pie' && (
              <CategoryPieChart data={chartCategoryData} />
            )}
            {activeTab === 'bar' && (
              <MonthlyBarChart data={trendData} currentMonth={currentMonthKey} />
            )}
            {activeTab === 'line' && (
              <TrendLineChart data={trendData} />
            )}
            {activeTab === 'calendar' && (
              <CalendarView year={year} month={month} />
            )}
          </div>
        </section>

        {/* 카테고리별 지출 목록 (아코디언) */}
        <section className="glass-card overflow-hidden">
          <h2 className="px-5 pt-4 pb-2 text-sm font-semibold text-gray-700">
            카테고리별 지출
          </h2>

          {/* 빈 상태 */}
          {categoryData.length === 0 ? (
            <p className="px-5 pb-5 text-sm text-gray-400">
              이 달의 지출 내역이 없습니다
            </p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {categoryData.map((cat) => {
                const percent = totalExpense > 0
                  ? Math.round((cat.amount / totalExpense) * 100)
                  : 0;
                const isExpanded = expandedCategory === cat.name;

                return (
                  <li key={cat.name}>
                    {/* 카테고리 카드 — 클릭 시 아코디언 토글 */}
                    <button
                      type="button"
                      onClick={() => toggleCategory(cat.name)}
                      className="w-full px-5 py-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 mb-1.5">
                        <span className="text-xl">{cat.icon}</span>
                        <span className="flex-1 text-sm font-medium text-gray-900">{cat.name}</span>
                        <span className="text-xs text-gray-400">{cat.count}건</span>
                        <span className="text-sm font-semibold text-gray-800">
                          {formatCurrency(cat.amount)}
                        </span>
                        <span className="text-xs text-gray-400 w-8 text-right">{percent}%</span>
                        {/* 아코디언 화살표 */}
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        >
                          <path fillRule="evenodd" d="M12.53 16.28a.75.75 0 01-1.06 0l-7.5-7.5a.75.75 0 011.06-1.06L12 14.69l6.97-6.97a.75.75 0 111.06 1.06l-7.5 7.5z" clipRule="evenodd" />
                        </svg>
                      </div>
                      {/* 카테고리별 진행바 */}
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-8">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${percent}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </button>

                    {/* 아코디언 — 거래 목록 */}
                    {isExpanded && (
                      <ul className="bg-gray-50 border-t border-gray-100">
                        {cat.transactions.map((txn, idx) => (
                          <li
                            key={idx}
                            className="flex items-center px-5 py-2.5 gap-3 border-b border-gray-100 last:border-b-0"
                          >
                            <span className="text-xs text-gray-400 w-16 shrink-0">{txn.date.slice(5)}</span>
                            <span className="flex-1 text-sm text-gray-700 truncate">{txn.memo || '메모 없음'}</span>
                            <span className="text-sm font-medium text-gray-900 shrink-0">
                              {formatCurrency(txn.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
