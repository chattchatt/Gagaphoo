# GaGapHoo (가갑후)

개인 맞춤형 AI 가계부 서비스. 지출을 빠르게 입력하고, AI가 자동 분류하며, 시각적 차트로 소비 습관을 한눈에 파악한다.

## 왜 만들었나

기존 가계부 앱의 광고, 프라이버시 우려, 맞지 않는 UX가 불만이었다. 나만을 위한 가계부를 직접 만든다.

## 핵심 기능 (v1)

- 빠른 입력 — 금액+메모만 입력하면 3초 이내 완료
- AI 자동 분류 — Claude API가 카테고리를 추천, 수동 수정 시 학습 반영
- 차트/리포트 — 카테고리별 파이차트, 월별 막대/라인차트 (토스 스타일)
- 예산 관리 — 카테고리별 월 예산 설정, 임계값 도달 시 푸시 알림
- 반복 지출 — 월세, 구독료 등 주기적 지출 자동 기록
- 데이터 백업 — JSON 내보내기/가져오기, 로컬 IndexedDB 우선 저장
- 다크모드 — 토스 스타일 라이트/다크 전환

## 기술 스택

| 항목 | 선택 |
|------|------|
| 프레임워크 | Next.js 15 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS v4 |
| DB | IndexedDB (Dexie.js) |
| AI | Claude API (Haiku — 분류) |
| 차트 | Recharts |
| PWA | Serwist |
| 배포 | Vercel |
| 디자인 | 토스 페이먼츠 + Naver DAN 24 참고 |

## 시작하기

```bash
npm install
npm run dev
```

`http://localhost:3000`에서 확인.

## 프로젝트 구조

```
src/
├── app/
│   ├── (routes)/
│   │   ├── input/         # 지출 입력
│   │   ├── report/        # 차트/리포트
│   │   └── settings/      # 설정
│   ├── globals.css        # 토스 테마 + 다크모드
│   ├── layout.tsx         # 반응형 레이아웃
│   ├── page.tsx           # 홈 대시보드
│   ├── manifest.ts        # PWA 매니페스트
│   └── sw.ts              # Service Worker
├── components/
│   └── layout/
│       ├── BottomNav.tsx   # 모바일 하단 네비
│       └── Sidebar.tsx     # 데스크톱 사이드바
├── lib/
│   ├── db.ts              # Dexie DB 스키마
│   ├── seed.ts            # 기본 카테고리 시드
│   └── format.ts          # 원화 포맷, 날짜 유틸
└── styles/
    └── colors.ts          # 토스 색상 팔레트
```

## 개발 로드맵

- [x] Sprint 0: 프로젝트 초기 세팅
- [ ] Sprint 1: 빠른 입력 + AI 분류
- [ ] Sprint 2: 차트/리포트
- [ ] Sprint 3: 예산 & 알림
- [ ] Sprint 4: 반복 지출
- [ ] Sprint 5: 백업/복원 + 배포

## v2 예정

- 영수증 OCR (Claude Vision API)
- 클라우드 동기화
