'use client';

// 앱 진입 시 브라우저 알림 권한을 요청하는 초기화 컴포넌트
import { useEffect } from 'react';
import { requestNotificationPermission } from '@/lib/notification';

export default function NotificationPermissionInit() {
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return null;
}
