import Link from 'next/link';

// 설정 메뉴 아이템 정의
const settingsMenus = [
  {
    group: '지출 관리',
    items: [
      {
        href: '/settings/budget',
        label: '예산 설정',
        description: '월별 카테고리 예산 관리',
        icon: '💰',
      },
      {
        href: '/settings/recurring',
        label: '반복 지출',
        description: '구독·월세 등 정기 지출 관리',
        icon: '🔄',
      },
      {
        href: '/settings/categories',
        label: '카테고리',
        description: '지출 카테고리 추가·편집',
        icon: '🏷️',
      },
    ],
  },
  {
    group: '앱 설정',
    items: [
      {
        href: '/settings/appearance',
        label: '다크모드',
        description: '화면 테마 설정',
        icon: '🌙',
      },
      {
        href: '/settings/backup',
        label: '백업',
        description: '데이터를 파일로 내보내기',
        icon: '📤',
      },
      {
        href: '/settings/restore',
        label: '복원',
        description: '백업 파일에서 데이터 가져오기',
        icon: '📥',
      },
    ],
  },
];

// 설정 페이지 (서버 컴포넌트 — 상태 없음)
export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      {/* 상단 헤더 */}
      <div className="bg-white px-5 pt-6 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">설정</h1>
      </div>

      <div className="px-4 py-4 space-y-5 max-w-2xl mx-auto">
        {settingsMenus.map((group) => (
          <section key={group.group}>
            {/* 그룹 레이블 */}
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
              {group.group}
            </h2>

            {/* 메뉴 카드 */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  {/* 아이콘 */}
                  <span className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                    {item.icon}
                  </span>

                  {/* 텍스트 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                  </div>

                  {/* 화살표 */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4 text-gray-300 flex-shrink-0"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.28 11.47a.75.75 0 010 1.06l-7.5 7.5a.75.75 0 01-1.06-1.06L14.69 12 7.72 5.03a.75.75 0 011.06-1.06l7.5 7.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* 앱 버전 정보 */}
        <p className="text-center text-xs text-gray-300 pt-2">GaGapHoo v0.1.0</p>
      </div>
    </div>
  );
}
