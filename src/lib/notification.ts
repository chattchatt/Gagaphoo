// PWA 브라우저 알림 유틸리티

/**
 * 알림 권한 요청 헬퍼
 * 이미 허용된 경우 중복 요청하지 않음
 */
export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined') return 'denied';
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return await Notification.requestPermission();
}

/**
 * 브라우저 알림 권한 요청 (하위 호환)
 */
export async function requestNotificationPermission(): Promise<void> {
  await requestPermission();
}

/**
 * Service Worker를 통해 알림 발송
 * Web Notification API 직접 호출 대신 SW showNotification 사용
 */
async function showViaServiceWorker(title: string, options: NotificationOptions): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, options);
  } catch {
    // SW를 통한 알림 실패 시 Web Notification API로 폴백
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, options);
    }
  }
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

  showViaServiceWorker(title, {
    body,
    icon: '/icon-192x192.png',
  });
}
