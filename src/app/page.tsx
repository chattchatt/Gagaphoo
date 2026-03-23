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

// YYYY-MM 문자열로부터 한국어 월 라벨 생성
function getMonthLabel(monthPrefix: string): string {
  const [year, month] = monthPrefix.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
  });
}

// YYYY-MM 문자열을 N개월 앞/뒤로 이동
function shiftMonth(monthPrefix: string, delta: number): string {
  const [year, month] = monthPrefix.split('-').map(Number);
  const d = new Date(year, month - 1 + delta, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export default function HomePage() {
  const todayLabel = getTodayLabel();

  // 오늘 날짜 (YYYY-MM-DD)
  const todayStr = new Date().toISOString().slice(0, 10);
  // 이번 달 접두사 (YYYY-MM)
  const thisMonthPrefix = new Date().toISOString().slice(0, 7);

  // 조회 중인 달 (기본값: 이번 달)
  const [viewMonth, setViewMonth] = useState<string>(thisMonthPrefix);
  const isCurrentMonth = viewMonth === thisMonthPrefix;

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

  // 오늘 지출 내역 실시간 조회 (이번 달 보기일 때만 사용)
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

  // 조회 달 지출 내역 실시간 조회 (총액 집계용)
  const monthlyTransactions = useLiveQuery<Transaction[], Transaction[]>(
    () =>
      db.transactions
        .where('date')
        .startsWith(viewMonth)
        .filter((t) => t.type === 'expense')
        .toArray(),
    [viewMonth],
    [],
  );

  // 조회 달 총 지출 계산
  const monthlyTotal = monthlyTransactions.reduce(
    (sum: number, t: Transaction) => sum + t.amount,
    0,
  );

  // 오늘 수입 내역 실시간 조회 (이번 달 보기일 때만 사용)
  const todayIncomes = useLiveQuery<Transaction[], Transaction[]>(
    () =>
      db.transactions
        .where('date')
        .equals(todayStr)
        .filter((t) => t.type === 'income')
        .sortBy('createdAt')
        .then((arr) => arr.reverse()),
    [todayStr],
    [],
  );

  // 조회 달 수입 내역 실시간 조회 (총액 집계용)
  const monthlyIncomes = useLiveQuery<Transaction[], Transaction[]>(
    () =>
      db.transactions
        .where('date')
        .startsWith(viewMonth)
        .filter((t) => t.type === 'income')
        .toArray(),
    [viewMonth],
    [],
  );

  // 조회 달 총 수입 계산
  const monthlyIncomeTotal = monthlyIncomes.reduce(
    (sum: number, t: Transaction) => sum + t.amount,
    0,
  );

  // 조회 달 예산 설정 여부 및 총 예산 실시간 조회
  const monthlyBudgets = useLiveQuery<Budget[], Budget[]>(
    () => db.budgets.where('month').equals(viewMonth).toArray(),
    [viewMonth],
    [],
  );

  // 총 예산 합산
  const totalBudget = monthlyBudgets.reduce(
    (sum: number, b: Budget) => sum + b.amount,
    0,
  );

  // 예산 사용률 (clamped: 진행바용, raw: 배너용)
  const budgetRawPercent =
    totalBudget > 0 ? Math.round((monthlyTotal / totalBudget) * 100) : 0;
  const budgetPercent = Math.min(budgetRawPercent, 100);

  // 진행바 색상: 80% 이상 주황, 100% 이상 빨강, 그 외 토스 블루
  const progressColor =
    monthlyTotal >= totalBudget && totalBudget > 0
      ? 'bg-red-500'
      : budgetPercent >= 80
        ? 'bg-orange-400'
        : 'bg-[#3182F6]';

  // 예산 경고 배너 표시 여부 (80% 이상이고 예산이 설정된 경우)
  const showBudgetWarning = totalBudget > 0 && budgetRawPercent >= 80;
  const budgetExceeded = totalBudget > 0 && monthlyTotal >= totalBudget;

  // 오늘 총 지출
  const todayTotal = todayTransactions.reduce(
    (sum: number, t: Transaction) => sum + t.amount,
    0,
  );

  // 조회 달 카테고리별 지출 집계
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

  // 이번 달에 이미 처리된 반복 지출 ID 집합 (중복 표시 방지)
  const processedRecurringIds = useLiveQuery<Set<number>, Set<number>>(
    () =>
      db.transactions
        .where('date')
        .startsWith(thisMonthPrefix)
        .filter((t) => t.recurringId != null)
        .toArray()
        .then((txs) => new Set(txs.map((t) => t.recurringId as number))),
    [thisMonthPrefix],
    new Set<number>(),
  );

  // 이번 달 남은 반복 지출 예정 계산 (오늘 이후 날짜 기준, 날짜 순 정렬)
  // 이미 처리된 항목은 목록에서 제외
  const upcomingRecurring = (() => {
    // 이번 달 보기가 아니면 표시 안 함
    if (!isCurrentMonth) return [];

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
      // 이미 이번 달에 처리된 항목 제외
      if (processedRecurringIds.has(rec.id)) continue;

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
    <div className="min-h-screen pb-20 md:pb-6">
      {/* 반복 지출 자동 처리 토스트 */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* 예산 초과/경고 배너 (80% 이상 사용 시) */}
      {showBudgetWarning && (
        <div
          className={`px-4 py-3 text-sm font-medium text-center ${
            budgetExceeded
              ? 'bg-red-50 text-red-700'
              : 'bg-orange-50 text-orange-700'
          }`}
        >
          {budgetExceeded
            ? `이번 달 예산을 초과했습니다. (${budgetRawPercent}% 사용)`
            : `이번 달 예산의 ${budgetRawPercent}%를 사용했습니다. 지출에 주의하세요.`}
        </div>
      )}

      {/* 상단 헤더 */}
      <div className="glass-header px-5 pt-6 pb-4">
        <p className="text-sm text-gray-400">{todayLabel}</p>
        <h1 className="text-xl font-bold text-gray-900 mt-0.5">오늘의 가계부</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* 월별 필터 네비게이션 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMonth((m) => shiftMonth(m, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-500 hover:bg-gray-50 active:scale-95 transition-all"
            aria-label="이전 달"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-gray-700">{getMonthLabel(viewMonth)}</span>
          <button
            onClick={() => setViewMonth((m) => shiftMonth(m, 1))}
            disabled={isCurrentMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-500 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="다음 달"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* 월별 총 지출 요약 카드 */}
        <section className="glass-card p-5">
          <p className="text-sm text-gray-500 mb-1">{getMonthLabel(viewMonth)} 총 지출</p>
          <p className="text-3xl font-bold text-gray-900">
            {formatCurrency(monthlyTotal)}
          </p>
          {/* 수입이 있을 때만 수입 합계 및 순수익 표시 */}
          {monthlyIncomeTotal > 0 && (
            <>
              <p className="text-lg font-semibold text-[#3182F6] mt-1">
                +{formatCurrency(monthlyIncomeTotal)}
              </p>
              <p className="text-sm text-gray-500">
                순수익 {formatCurrency(monthlyIncomeTotal - monthlyTotal)}
              </p>
            </>
          )}

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
            isCurrentMonth && (
              <div className="mt-4">
                <Link
                  href="/settings/budget"
                  className="text-xs text-[#3182F6] hover:underline"
                >
                  예산을 설정하세요 →
                </Link>
              </div>
            )
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

        {/* 오늘 지출 목록 — 이번 달 보기일 때만 표시 */}
        {isCurrentMonth && (
          <section className="glass-card overflow-hidden">
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
        )}

        {/* 오늘 수입 목록 — 이번 달 보기이고 수입이 있을 때만 표시 */}
        {isCurrentMonth && todayIncomes.length > 0 && (
          <section className="glass-card overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <h2 className="text-sm font-semibold text-gray-700">오늘 수입</h2>
              <span className="text-sm font-bold text-[#3182F6]">
                +{formatCurrency(todayIncomes.reduce((s, t) => s + t.amount, 0))}
              </span>
            </div>
            <ul className="divide-y divide-gray-50">
              {todayIncomes.map((tx: Transaction) => {
                const cat: Category | undefined = categoryMap.get(tx.categoryId);
                return (
                  <li
                    key={tx.id}
                    className="flex items-center gap-3 px-5 py-3 active:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTransaction(tx)}
                  >
                    <span className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">
                      {cat?.icon ?? '💰'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {tx.memo || cat?.name || '수입'}
                      </p>
                      <p className="text-xs text-gray-400">{cat?.name ?? '기타'}</p>
                    </div>
                    <span className="text-sm font-semibold text-[#3182F6]">
                      +{formatCurrency(tx.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* 날짜별 거래 내역 — 해당 월의 지출+수입을 날짜별 그룹핑 */}
        {(() => {
          // 지출 + 수입 합산 (이번 달이면 오늘 제외, 오늘 거래는 위에서 별도 표시)
          const allMonthlyTxs = [...monthlyTransactions, ...monthlyIncomes];
          const filteredTxs = isCurrentMonth
            ? allMonthlyTxs.filter((t) => t.date !== todayStr)
            : allMonthlyTxs;

          // 날짜별 그룹핑 (내림차순)
          const grouped = new Map<string, Transaction[]>();
          for (const tx of filteredTxs) {
            const list = grouped.get(tx.date) ?? [];
            list.push(tx);
            grouped.set(tx.date, list);
          }
          const sortedDates = Array.from(grouped.keys()).sort((a, b) => b.localeCompare(a));

          if (sortedDates.length === 0 && !isCurrentMonth) {
            return (
              <section className="glass-card overflow-hidden">
                <div className="px-5 py-6 text-center">
                  <p className="text-sm text-gray-400">이 달의 지출 내역이 없습니다</p>
                </div>
              </section>
            );
          }

          return sortedDates.map((date) => {
            const txs = grouped.get(date) ?? [];
            // 최신순 정렬
            txs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            // 일별 순수익 (수입 - 지출)
            const dayExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const dayIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const dayNet = dayIncome - dayExpense;
            // 날짜 라벨: "3월 21일 (금)"
            const d = new Date(date + 'T00:00:00');
            const dateLabel = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

            return (
              <section key={date} className="glass-card overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 pb-2">
                  <h2 className="text-sm font-semibold text-gray-700">{dateLabel}</h2>
                  {/* 수입/지출 혼합 시 순수익 표시, 지출만 있으면 지출액 표시 */}
                  <span className={`text-sm font-bold ${dayNet >= 0 ? 'text-[#3182F6]' : 'text-gray-500'}`}>
                    {dayNet >= 0
                      ? `+${formatCurrency(dayNet)}`
                      : formatCurrency(dayExpense)}
                  </span>
                </div>
                <ul className="divide-y divide-gray-50">
                  {txs.map((tx: Transaction) => {
                    const cat: Category | undefined = categoryMap.get(tx.categoryId);
                    const isIncome = tx.type === 'income';
                    return (
                      <li
                        key={tx.id}
                        className="flex items-center gap-3 px-5 py-3 active:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedTransaction(tx)}
                      >
                        <span className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${isIncome ? 'bg-blue-50' : 'bg-gray-100'}`}>
                          {cat?.icon ?? (isIncome ? '💰' : '📌')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {tx.memo || cat?.name || (isIncome ? '수입' : '지출')}
                          </p>
                          <p className="text-xs text-gray-400">{cat?.name ?? '기타'}</p>
                        </div>
                        <span className={`text-sm font-semibold ${isIncome ? 'text-[#3182F6]' : 'text-gray-800'}`}>
                          {isIncome ? '+' : ''}{formatCurrency(tx.amount)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          });
        })()}

        {/* 다가오는 반복 지출 섹션 — 이번 달 남은 예정 항목이 있을 때만 표시 */}
        {upcomingRecurring.length > 0 && (
          <section className="glass-card overflow-hidden">
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
        onDeleted={() => {
          setSelectedTransaction(null);
          setToast('내역이 삭제됐습니다.');
        }}
        onUpdated={() => {
          setToast('내역이 수정됐습니다.');
        }}
      />
    </div>
  );
}
