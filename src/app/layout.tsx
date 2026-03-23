import type { Metadata } from 'next';
import './globals.css';
import BottomNav from '@/components/layout/BottomNav';
import Sidebar from '@/components/layout/Sidebar';
import NotificationPermissionInit from '@/components/NotificationPermissionInit';

export const metadata: Metadata = {
  title: 'GaGapHoo',
  description: '나만의 AI 가계부',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full" suppressHydrationWarning>
      {/* 다크모드 플래시 방지: 페이지 렌더 전에 localStorage 값 읽어 html에 dark 클래스 적용 */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('gagaphoo-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="h-full bg-[var(--background)] text-[var(--foreground)]">
        {/* 앱 진입 시 브라우저 알림 권한 요청 */}
        <NotificationPermissionInit />

        {/* 데스크톱: 사이드바 레이아웃 */}
        <Sidebar />

        {/* 메인 콘텐츠 영역 — 데스크톱은 사이드바(w-64) 만큼 왼쪽 여백, 모바일은 없음 */}
        <main className="md:pl-64 min-h-full pb-16 md:pb-0">
          {children}
        </main>

        {/* 모바일: 하단 네비게이션 */}
        <BottomNav />
      </body>
    </html>
  );
}
