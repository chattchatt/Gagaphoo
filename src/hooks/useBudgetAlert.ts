'use client';

// 예산 임계값 알림 훅
import { useCallback } from 'react';
import { checkBudgetThresholds } from '@/lib/budget';
import { sendBudgetAlert } from '@/lib/notification';

/**
 * 현재 월의 예산 임계값을 확인하고 알림을 발송하는 훅
 * 동일한 달/카테고리/임계값에 대해 중복 알림을 방지하기 위해 localStorage 사용
 */
export function useBudgetAlert() {
  const checkAndNotify = useCallback(async () => {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    const alerts = await checkBudgetThresholds(month);

    if (alerts.length === 0) return;

    for (const alert of alerts) {
      const storageKey = `budget-alert-${month}-${alert.categoryId}-${alert.threshold}`;

      // 이미 발송한 알림은 건너뜀
      if (localStorage.getItem(storageKey)) continue;

      sendBudgetAlert(alert.categoryName, alert.percent);

      // 발송 기록 저장 (해당 달이 지나면 자동으로 무의미해짐)
      localStorage.setItem(storageKey, '1');
    }
  }, []);

  return { checkAndNotify };
}
