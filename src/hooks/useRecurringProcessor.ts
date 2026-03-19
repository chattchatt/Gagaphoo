'use client';

// 앱 로드 시 반복 지출을 자동 처리하는 훅
// localStorage로 하루 1회 실행 제한
import { useEffect } from 'react';
import { processRecurringExpenses } from '@/lib/recurring';

const STORAGE_KEY = 'recurring-processed-date';

/**
 * 앱 최초 마운트 시 오늘의 반복 지출을 자동 기록.
 * 하루에 한 번만 실행되도록 localStorage로 제한.
 * @param onProcessed 새로 기록된 건수를 받는 콜백 (건수 > 0일 때만 호출)
 */
export function useRecurringProcessor(onProcessed: (count: number) => void) {
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    // 오늘 이미 처리했으면 건너뜀
    if (localStorage.getItem(STORAGE_KEY) === todayStr) return;

    processRecurringExpenses()
      .then((count) => {
        // 처리 완료 날짜 기록
        localStorage.setItem(STORAGE_KEY, todayStr);
        if (count > 0) {
          onProcessed(count);
        }
      })
      .catch((err) => {
        // 처리 실패 시 다음 로드에서 재시도할 수 있도록 기록하지 않음
        console.error('[반복 지출 처리 오류]', err);
      });
  // onProcessed는 매 렌더마다 새 참조가 생길 수 있으므로 의존성에서 제외
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
