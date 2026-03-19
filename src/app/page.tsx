'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Transaction, type Category, type Budget, type RecurringExpense } from '@/lib/db';
import { initializeDB } from '@/lib/seed';
import { formatCurrency } from '@/lib/format';
import TransactionDetail from '@/components/TransactionDetail';
import { useRecurringProcessor } from '@/hooks/useRecurringProcessor';

// 토스트 컴포넌트 (하단 중앙 알림)
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap">
      {message}
    </div>
  );
}

// 요일 레이블
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

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

export default function HomePage() {
  const todayLabel = getTodayLabel();
  const currentMonth = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });

  // 오늘 날짜 (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);
  // 이번 달 접두사 (YYYY-MM)
  const thisMonthPrefix = new Date().toISOString().slice(0, 7);

  // DB 초기화 — 최초 실행 시 기본 카테고리 삽입
  useEffect(() => {
    initializeDB();
  }, []);

  // 토스트 메시지 상태
  const [toast, setToast] = useState<string | null>(null);

  // 반복 지출 자동 처리 (하루 1회) — 처리 건수 > 0이면 토스트
  const handleProcessed = useCallback((count: number) => {
    setToast(`반복 지출 ${count}건이 자동으로 기록됐습니다.`);
  }, []);
  useRecurringProcessor(handleProcessed);

  // 선택된 거래 (바텀시트 표시용)
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  // 카테고리 전체 실시간 조회 (undefined 방지: 기본값 [] 지정)
  const categories = useLiveQuery<Category[], Category[]>(
    () => db.categories.toArray(),
    [],
    [],
  );

  // categoryId → Category 매핑 맵
  const categoryMap = new Map<number, Category>(
    categories.map((c) => [c.id, c]),
  );

  // 오늘 지출 내역 실시간 조회
  const todayTransactions = useLiveQuery<Transaction[], Transaction[]>(
    () =>
      db.transactions
        .where('date')
        .equals(todayStr)
        .filter((t) => t.type === 'expense')
        .sortBy('createdAt')
        .then((arr) => arr.reverse()),
    [todayStr],
    [],
  );

  // 이번 달 지출 내역 실시간 조회 (총액 집계용)
  const monthlyTransactions = useLiveQuery<Transaction[], Transaction[]>(
    () =>
      db.transactions
        .where('date')
        .startsWith(thisMonthPrefix)
        .filter((t) => t.type === 'expense')
        .toArray(),
    [thisMonthPrefix],
    [],
  );

  // 이번 달 총 지출 계산
  const monthlyTotal = monthlyTransactions.reduce(
    (sum: number, t: Transaction) => sum + t.amount,
    0,
  );

  // 이번 달 예산 설정 여부 및 총 예산 실시간 조회
  const monthlyBudgets = useLiveQuery<Budget[], Budget[]>(
    () => db.budgets.where('month').equals(thisMonthPrefix).toArray(),
    [thisMonthPrefix],
    [],
  );

  // 총 예산 합산
  const totalBudget = monthlyBudgets.reduce(
    (sum: number, b: Budget) => sum + b.amount,
    0,
  );

  // 예산 사용률 (0~100 이상)
  const budgetPercent =
    totalBudget > 0 ? Math.min(Math.round((monthlyTotal / totalBudget) * 100), 100) : 0;

  // 진행바 색상: 80% 이상 주황, 100% 이상 빨강, 그 외 토스 블루
  const progressColor =
    monthlyTotal >= totalBudget && totalBudget > 0
      ? 'bg-red-500'
      : budgetPercent >= 80
        ? 'bg-orange-400'
        : 'bg-[#3182F6]';

  // 오늘 총 지출
  const todayTotal = todayTransactions.reduce(
    (sum: number, t: Transaction) => sum + t.amount,
    0,
  );

  // 이번 달 카테고리별 지출 집계
  const categoryTotals = monthlyTransactions.reduce<Map<number, number>>(
    (acc: Map<number, number>, t: Transaction) => {
      acc.set(t.categoryId, (acc.get(t.categoryId) ?? 0) + t.amount);
      return acc;
    },
    new Map<number, number>(),
  );

  // 상위 3개 카테고리 정렬
  const topCategories = Array.from(categoryTotals.entries())
    .sort((a: [number, number], b: [number, number]) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, amount]: [number, number]) => ({
      id,
      amount,
      name: categoryMap.get(id)?.name ?? '기타',
      icon: categoryMap.get(id)?.icon ?? '📌',
    }));

  // 거래가 0건인 빈 상태 여부
  const isEmpty = todayTransactions.length === 0;

  // 활성화된 반복 지출 전체 조회 (다가오는 반복 지출 섹션용)
  const recurringItems = useLiveQuery<RecurringExpense[], RecurringExpense[]>(
    () => db.recurringExpenses.where('isActive').equals(1).toArray(),
    [],
    [],
  );

  // 이번 달 남은 반복 지출 예정 계산 (오늘 이후 날짜 기준, 날짜 순 정렬)
  const upcomingRecurring = (() => {
    const today = new Date();
    const todayDay = today.getDate();
    const todayWeekday = today.getDay();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    type UpcomingItem = {
      rec: RecurringExpense;
      dueDate: string; // YYYY-MM-DD
      dueDay: number;  // 일(day) 숫자 (정렬용)
    };

    const result: UpcomingItem[] = [];

    for (const rec of recurringItems) {
      if (rec.cycle === 'monthly' && rec.dayOfMonth != null) {
        // 오늘 포함, 이번 달 내 남은 날짜
        if (rec.dayOfMonth >= todayDay && rec.dayOfMonth <= daysInMonth) {
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(rec.dayOfMonth).padStart(2, '0');
          result.push({
            rec,
            dueDate: `${today.getFullYear()}-${mm}-${dd}`,
            dueDay: rec.dayOfMonth,
          });
        }
      } else if (rec.cycle === 'weekly' && rec.dayOfWeek != null) {
        // 이번 주 해당 요일이 오늘 이후인지 확인 (이번 달 내)
        let diff = rec.dayOfWeek - todayWeekday;
        if (diff < 0) diff += 7;
        const dueDay = todayDay + diff;
        if (dueDay <= daysInMonth) {
          const mm = String(today.getMonth() + 1).padStart(2, '0');
          const dd = String(dueDay).padStart(2, '0');
          result.push({
            rec,
            dueDate: `${today.getFullYear()}-${mm}-${dd}`,
            dueDay,
          });
        }
      }
    }

    // 날짜 순 정렬
    return result.sort((a, b) => a.dueDay - b.dueDay);
  })();

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      {/* 반복 지출 자동 처리 토스트 */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

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
            {formatCurrency(monthlyTotal)}
          </p>

          {/* 예산 진행바 — 예산 설정 시 표시 */}
          {totalBudget > 0 ? (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400">
                  예산 {formatCurrency(totalBudget)} 중 {budgetPercent}% 사용
                </span>
                <span className="text-xs text-gray-400">
                  {formatCurrency(totalBudget - monthlyTotal > 0 ? totalBudget - monthlyTotal : 0)} 남음
                </span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressColor}`}
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <Link
                href="/settings/budget"
                className="text-xs text-[#3182F6] hover:underline"
              >
                예산을 설정하세요 →
              </Link>
            </div>
          )}

          {/* 카테고리별 상위 지출 — 지출이 있을 때만 표시 */}
          {topCategories.length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {topCategories.map((cat) => (
                <div
                  key={cat.id}
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
          )}
        </section>

        {/* 오늘 지출 목록 */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-sm font-semibold text-gray-700">오늘 지출</h2>
            <span className="text-sm font-bold text-[#3182F6]">
              {formatCurrency(todayTotal)}
            </span>
          </div>

          {isEmpty ? (
            /* 빈 상태 안내 */
            <div className="px-5 pb-6 pt-2 text-center">
              <p className="text-sm text-gray-400 mb-1">아직 지출 내역이 없습니다</p>
              <p className="text-xs text-gray-300">
                아래 + 버튼을 눌러 첫 지출을 기록해 보세요
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {todayTransactions.map((tx: Transaction) => {
                const cat: Category | undefined = categoryMap.get(tx.categoryId);
                return (
                  <li
                    key={tx.id}
                    className="flex items-center gap-3 px-5 py-3 active:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTransaction(tx)}
                  >
                    {/* 카테고리 아이콘 */}
                    <span className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                      {cat?.icon ?? '📌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {tx.memo || cat?.name || '지출'}
                      </p>
                      <p className="text-xs text-gray-400">{cat?.name ?? '기타'}</p>
                    </div>
                    <span className="text-sm font-semibold text-gray-800">
                      {formatCurrency(tx.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        {/* 다가오는 반복 지출 섹션 — 이번 달 남은 예정 항목이 있을 때만 표시 */}
        {upcomingRecurring.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-gray-700">다가오는 반복 지출</h2>
              <Link
                href="/settings/recurring"
                className="text-xs text-[#3182F6] hover:underline"
              >
                관리
              </Link>
            </div>
            <ul className="divide-y divide-gray-50">
              {upcomingRecurring.map(({ rec, dueDate, dueDay }) => {
                const cat: Category | undefined = categoryMap.get(rec.categoryId);
                const isToday = dueDate === todayStr;
                // 요일 표시 (weekly인 경우)
                const dateLabel = rec.cycle === 'weekly' && rec.dayOfWeek != null
                  ? `${dueDay}일 (${DAY_LABELS[rec.dayOfWeek]})`
                  : `${dueDay}일`;
                return (
                  <li key={rec.id} className="flex items-center gap-3 px-5 py-3">
                    {/* 카테고리 아이콘 */}
                    <span className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                      {cat?.icon ?? '📌'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{rec.memo}</p>
                      <p className="text-xs text-gray-400">
                        {cat?.name ?? '기타'} ·{' '}
                        <span className={isToday ? 'text-[#3182F6] font-semibold' : ''}>
                          {isToday ? '오늘' : dateLabel}
                        </span>
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 flex-shrink-0">
                      {formatCurrency(rec.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
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

      {/* 거래 상세 바텀시트 */}
      <TransactionDetail
        transaction={selectedTransaction}
        categories={categories}
        isOpen={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
