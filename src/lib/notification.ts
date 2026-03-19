// PWA 브라우저 알림 유틸리티

/**
 * 브라우저 알림 권한 요청
 * 이미 허용된 경우 중복 요청하지 않음
 */
export async function requestNotificationPermission(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') return;
  if (Notification.permission === 'denied') return;

  await Notification.requestPermission();
}

/**
 * 예산 알림 발송
 * @param categoryName 카테고리 이름
 * @param percent 사용률 (0~100 이상)
 * - 100% 이상: 예산 초과 알림
 * - 80% 이상: 예산 경고 알림
 */
export function sendBudgetAlert(categoryName: string, percent: number): void {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const isOverBudget = percent >= 100;

  const title = isOverBudget
    ? `${categoryName} 예산 초과`
    : `${categoryName} 예산 80% 도달`;

  const body = isOverBudget
    ? `이번 달 ${categoryName} 예산을 ${percent}% 사용했습니다. 지출을 줄여보세요.`
    : `이번 달 ${categoryName} 예산의 ${percent}%를 사용했습니다.`;

  new Notification(title, {
    body,
    icon: '/icon-192x192.png',
  });
}
