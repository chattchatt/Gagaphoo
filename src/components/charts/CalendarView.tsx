'use client';

import { useState, useCallback, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { formatCurrency } from '@/lib/format';

interface Props {
  year: number;
  month: number;
}

// 해당 월의 달력 그리드 날짜 배열 생성 (앞뒤 빈칸 포함)
function buildCalendarGrid(year: number, month: number): (number | null)[] {
  // 1일의 요일 (0=일, 6=토)
  const firstDow = new Date(year, month - 1, 1).getDay();
  // 해당 월 총 일수
  const daysInMonth = new Date(year, month, 0).getDate();

  const grid: (number | null)[] = [];
  // 앞쪽 빈칸
  for (let i = 0; i < firstDow; i++) grid.push(null);
  // 날짜
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  // 뒤쪽 빈칸 (7의 배수로 맞춤)
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarView({ year, month }: Props) {
  // 클릭된 날짜 (펼쳐보기)
  const [expandedDay, setExpandedDay] = useState<number | null>(null);

  // 드래그 앤 드롭 상태
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const draggedTxId = useRef<number | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 해당 월 YYYY-MM 키
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;

  // 해당 월 모든 거래 (수입 + 지출) 조회
  const dailyData = useLiveQuery(async () => {
    // date 인덱스로 해당 월 범위 조회 (type 필터 없음)
    const txns = await db.transactions
      .where('date')
      .startsWith(monthKey)
      .toArray();

    // 카테고리 맵
    const categories = await db.categories.toArray();
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    // 날짜별 집계
    const byDay = new Map<
      number,
      {
        expense: number;
        income: number;
        items: { id: number; memo: string; amount: number; type: 'income' | 'expense'; icon: string; categoryName: string }[];
      }
    >();

    for (const txn of txns) {
      const day = parseInt(txn.date.slice(8, 10), 10);
      if (!byDay.has(day)) {
        byDay.set(day, { expense: 0, income: 0, items: [] });
      }
      const entry = byDay.get(day)!;
      const cat = categoryMap.get(txn.categoryId);

      if (txn.type === 'expense') {
        entry.expense += txn.amount;
      } else {
        entry.income += txn.amount;
      }
      entry.items.push({
        id: txn.id,
        memo: txn.memo,
        amount: txn.amount,
        type: txn.type,
        icon: cat?.icon ?? '📌',
        categoryName: cat?.name ?? '알 수 없음',
      });
    }

    // 날짜별 아이템을 시간순(id 오름차순)으로 정렬
    for (const entry of byDay.values()) {
      entry.items.sort((a, b) => a.id - b.id);
    }

    return byDay;
  }, [monthKey]);

  const grid = buildCalendarGrid(year, month);

  const toggleDay = (day: number) => {
    setExpandedDay((prev) => (prev === day ? null : day));
  };

  // 토스트 표시 (2초 후 자동 소멸)
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2000);
  }, []);

  // 드래그 시작: 거래 ID를 ref에 저장
  const handleDragStart = useCallback((e: React.DragEvent, txId: number) => {
    draggedTxId.current = txId;
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  // 드래그 대상 셀 위에 있을 때 하이라이트
  const handleDragOver = useCallback((e: React.DragEvent, day: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(day);
  }, []);

  // 드래그가 셀을 벗어날 때 하이라이트 제거
  const handleDragLeave = useCallback(() => {
    setDragOverDay(null);
  }, []);

  // 드롭: 거래 날짜를 새 날짜로 업데이트
  const handleDrop = useCallback(async (e: React.DragEvent, day: number) => {
    e.preventDefault();
    setDragOverDay(null);
    const txId = draggedTxId.current;
    if (txId === null) return;
    draggedTxId.current = null;
    const newDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    await db.transactions.update(txId, { date: newDate });
    showToast('날짜가 변경되었습니다');
  }, [year, month, showToast]);

  return (
    <div className="w-full">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map((label, i) => (
          <div
            key={label}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
            }`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
        {grid.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="h-16" />;
          }

          const data = dailyData?.get(day);
          const hasData = data && (data.expense > 0 || data.income > 0);
          const isExpanded = expandedDay === day;
          const colIdx = idx % 7;

          return (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              onDragOver={(e) => handleDragOver(e, day)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, day)}
              className={`h-16 flex flex-col items-center pt-1 px-0.5 transition-colors hover:bg-blue-50 ${
                isExpanded ? 'bg-blue-50' : ''
              } ${dragOverDay === day ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : ''}`}
            >
              {/* 날짜 숫자 */}
              <span
                className={`text-xs font-semibold mb-0.5 ${
                  colIdx === 0
                    ? 'text-red-400'
                    : colIdx === 6
                    ? 'text-blue-400'
                    : 'text-gray-700'
                }`}
              >
                {day}
              </span>

              {/* 지출 금액 (빨간색) */}
              {hasData && data.expense > 0 && (
                <span className="text-[10px] leading-tight text-red-500 font-medium truncate w-full text-center">
                  -{formatCurrency(data.expense)}
                </span>
              )}

              {/* 수입 금액 (파란색) */}
              {hasData && data.income > 0 && (
                <span className="text-[10px] leading-tight text-blue-500 font-medium truncate w-full text-center">
                  +{formatCurrency(data.income)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 선택된 날짜 상세 목록 */}
      {expandedDay !== null && (
        <div className="mt-3 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800">
              {month}월 {expandedDay}일 거래 내역
            </span>
            <button
              type="button"
              onClick={() => setExpandedDay(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="닫기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {(() => {
            const data = dailyData?.get(expandedDay);
            const items = data?.items ?? [];

            if (items.length === 0) {
              return (
                <p className="px-4 py-4 text-sm text-gray-400">거래 내역이 없습니다</p>
              );
            }

            return (
              <ul className="divide-y divide-gray-100">
                {items.map((item) => (
                  <li
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-grab active:cursor-grabbing touch-pan-y"
                  >
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 truncate">{item.memo || '메모 없음'}</p>
                      <p className="text-xs text-gray-400">{item.categoryName}</p>
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        item.type === 'expense' ? 'text-red-500' : 'text-blue-500'
                      }`}
                    >
                      {item.type === 'expense' ? '-' : '+'}{formatCurrency(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            );
          })()}
        </div>
      )}
      {/* 드래그 앤 드롭 완료 토스트 */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm px-4 py-2 rounded-full shadow-lg pointer-events-none">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
