'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Transaction, type Category } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/format';
import TransactionDetail from '@/components/TransactionDetail';

// 날짜별 그룹핑 타입
type GroupedTransactions = {
  date: string;
  transactions: Transaction[];
}[];

function groupByDate(transactions: Transaction[]): GroupedTransactions {
  const map = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const list = map.get(tx.date) ?? [];
    list.push(tx);
    map.set(tx.date, list);
  }
  // 날짜 내림차순 정렬
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, txList]) => ({ date, transactions: txList }));
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // 300ms debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const categories = useLiveQuery<Category[], Category[]>(
    () => db.categories.toArray(),
    [],
    [],
  );

  const categoryMap = useMemo(
    () => new Map<number, Category>(categories.map((c) => [c.id, c])),
    [categories],
  );

  // 메모 기반 검색 — debouncedQuery가 있을 때만 실행
  const searchResults = useLiveQuery<Transaction[], Transaction[]>(
    async () => {
      if (!debouncedQuery) return [];
      const all = await db.transactions.toArray();
      const q = debouncedQuery.toLowerCase();
      return all
        .filter((tx) => tx.memo.toLowerCase().includes(q))
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    [debouncedQuery],
    [],
  );

  const grouped = useMemo(() => groupByDate(searchResults), [searchResults]);

  return (
    <div className="min-h-screen pb-20 md:pb-6">
      <div className="px-4 pt-6 pb-4 md:px-6 md:pt-8 sticky top-0 z-10">
        {/* 검색 헤더 */}
        <h1 className="fluid-heading text-gray-900 mb-3">검색</h1>
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            <path
              fillRule="evenodd"
              d="M10.5 3.75a6.75 6.75 0 100 13.5 6.75 6.75 0 000-13.5zM2.25 10.5a8.25 8.25 0 1114.59 5.28l4.69 4.69a.75.75 0 11-1.06 1.06l-4.69-4.69A8.25 8.25 0 012.25 10.5z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="메모로 검색"
            className="w-full pl-9 pr-4 py-2.5 min-h-[44px] bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3182F6]"
            autoFocus
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="검색어 지우기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {/* 검색어 없음 */}
        {!debouncedQuery && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">메모를 입력해 내역을 검색하세요</p>
          </div>
        )}

        {/* 검색 결과 없음 */}
        {debouncedQuery && searchResults.length === 0 && (
          <div className="text-center py-16">
            <p className="text-sm text-gray-400">
              &apos;{debouncedQuery}&apos;에 해당하는 내역이 없습니다
            </p>
          </div>
        )}

        {/* 검색 결과 — 날짜별 그룹 */}
        {grouped.map(({ date, transactions }) => (
          <section key={date} className="glass-card overflow-hidden">
            <div className="px-5 pt-4 pb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">{formatDate(date)}</span>
              <span className="text-xs text-gray-400">
                {transactions.length}건
              </span>
            </div>
            <ul className="divide-y divide-white/10">
              {transactions.map((tx) => {
                const cat = categoryMap.get(tx.categoryId);
                return (
                  <li
                    key={tx.id}
                    className="flex items-center gap-3 px-5 py-3 active:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTransaction(tx)}
                  >
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
          </section>
        ))}

        {/* 결과 개수 표시 */}
        {debouncedQuery && searchResults.length > 0 && (
          <p className="text-center text-xs text-gray-400">
            총 {searchResults.length}건
          </p>
        )}
      </div>

      {/* 거래 상세 바텀시트 */}
      <TransactionDetail
        transaction={selectedTransaction}
        categories={categories}
        isOpen={selectedTransaction !== null}
        onClose={() => setSelectedTransaction(null)}
        onDeleted={() => setSelectedTransaction(null)}
      />
    </div>
  );
}
