'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 테마 타입
type Theme = 'light' | 'dark' | 'system';

// localStorage 키
const THEME_STORAGE_KEY = 'gagaphoo-theme';

// 시스템 다크모드 여부 확인 (SSR 안전)
function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// html 요소에 dark 클래스 적용/제거 (SSR 안전)
function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark' || (theme === 'system' && getSystemPrefersDark());
  document.documentElement.classList.toggle('dark', isDark);
}

// 저장된 테마 읽기 (기본값: 'system')
function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // localStorage 접근 불가 환경 (SSR 등)
  }
  return 'system';
}

export default function AppearancePage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>('system');

  // 초기 테마 로드
  useEffect(() => {
    setTheme(loadTheme());
  }, []);

  // 시스템 다크모드 변경 감지
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') applyTheme('system');
    };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [theme]);

  // 테마 변경 처리
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // localStorage 쓰기 실패 무시
    }
    applyTheme(newTheme);
  };

  const options: { value: Theme; label: string; description: string; icon: string }[] = [
    {
      value: 'light',
      label: '라이트',
      description: '항상 밝은 화면으로 표시합니다.',
      icon: '☀️',
    },
    {
      value: 'dark',
      label: '다크',
      description: '항상 어두운 화면으로 표시합니다.',
      icon: '🌙',
    },
    {
      value: 'system',
      label: '시스템 설정',
      description: '기기의 다크모드 설정을 따릅니다.',
      icon: '⚙️',
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-20 md:pb-6">
      {/* 상단 헤더 */}
      <div className="bg-[var(--background)] px-5 pt-6 pb-4 border-b border-[var(--border)] flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 -ml-1"
          aria-label="뒤로가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">화면 테마</h1>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {/* 테마 옵션 카드 */}
        <section className="bg-[var(--background)] rounded-2xl shadow-sm overflow-hidden divide-y divide-[var(--border)]">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleThemeChange(opt.value)}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--surface)] transition-colors text-left"
            >
              {/* 아이콘 */}
              <span className="w-10 h-10 rounded-full bg-[var(--surface)] flex items-center justify-center text-xl flex-shrink-0">
                {opt.icon}
              </span>

              {/* 텍스트 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)]">{opt.label}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">{opt.description}</p>
              </div>

              {/* 선택 표시 */}
              {theme === opt.value && (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3182F6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </button>
          ))}
        </section>

        {/* 현재 적용 중인 테마 안내 */}
        <p className="text-xs text-center text-[var(--text-tertiary)] pt-1">
          {theme === 'system'
            ? `시스템 설정에 따라 ${getSystemPrefersDark() ? '다크' : '라이트'} 모드가 적용 중입니다.`
            : theme === 'dark'
            ? '다크 모드가 적용 중입니다.'
            : '라이트 모드가 적용 중입니다.'}
        </p>
      </div>
    </div>
  );
}
