// IndexedDB 데이터베이스 스키마 정의 (Dexie.js 사용)
import Dexie, { type EntityTable } from 'dexie';

// 거래 내역 (수입/지출)
export interface Transaction {
  id: number;
  amount: number;
  memo: string;
  categoryId: number;
  type: 'income' | 'expense';
  date: string; // YYYY-MM-DD
  aiClassified: boolean;   // AI가 자동 분류했는지 여부
  userModified: boolean;   // 사용자가 직접 수정했는지 여부
  recurringId?: number;    // 반복 지출 ID (자동 생성된 경우)
  createdAt: Date;
}

// 카테고리
export interface Category {
  id: number;
  name: string;
  icon: string;   // 이모지 아이콘
  color: string;  // HEX 색상 코드
  isDefault: boolean;
}

// 예산 설정 (월별 카테고리 예산)
export interface Budget {
  id: number;
  categoryId: number;
  month: string;  // YYYY-MM
  amount: number;
}

// 반복 지출 (구독, 월세 등)
export interface RecurringExpense {
  id: number;
  amount: number;
  memo: string;
  categoryId: number;
  cycle: 'monthly' | 'weekly';
  dayOfMonth: number | null;  // 매월 N일 (monthly일 때)
  dayOfWeek: number | null;   // 요일 0=일, 6=토 (weekly일 때)
  isActive: boolean;
  createdAt: Date;
}

// 고정 수입 (급여, 부수입 등)
export interface FixedIncome {
  id: number;
  amount: number;
  memo: string;      // e.g. "급여", "부수입"
  isActive: boolean;
  createdAt: Date;
}

// AI 분류 결과 캐시
export interface ClassificationCache {
  id: number;
  memoPattern: string;  // 메모 텍스트 (인덱스)
  categoryId: number;
  hitCount: number;
  lastUsed: Date;
}

// 소비 DNA 분석 결과 (월별)
export interface SpendingDNA {
  id: number;
  month: string; // YYYY-MM
  scores: string; // JSON: { saving, planning, diversity, impulse, investment }
  primaryType: string;
  secondaryType: string;
  createdAt: Date;
}

// AI 코칭 응답 캐시 (월별)
export interface CoachingCache {
  id: number;
  month: string; // YYYY-MM
  content: string; // JSON string
  createdAt: Date;
}

// Dexie 데이터베이스 클래스 정의
class GagaphooDatabase extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  recurringExpenses!: EntityTable<RecurringExpense, 'id'>;
  classificationCache!: EntityTable<ClassificationCache, 'id'>;
  fixedIncomes!: EntityTable<FixedIncome, 'id'>;
  spendingDNA!: EntityTable<SpendingDNA, 'id'>;
  coachingCache!: EntityTable<CoachingCache, 'id'>;

  constructor() {
    super('gagaphoo-db');

    // 스키마 버전 1 정의
    this.version(1).stores({
      // id는 자동 증가 기본키, 나머지는 인덱스 컬럼
      transactions: '++id, date, categoryId, type',
      categories: '++id, name',
      budgets: '++id, categoryId, month',
      recurringExpenses: '++id, categoryId, isActive',
    });

    // 버전 2: AI 분류 캐시 테이블 추가
    this.version(2).stores({
      transactions: '++id, date, categoryId, type',
      categories: '++id, name',
      budgets: '++id, categoryId, month',
      recurringExpenses: '++id, categoryId, isActive',
      classificationCache: '++id, memoPattern',
    });

    // 버전 3: transactions에 recurringId 인덱스 추가 (반복 지출 중복 방지)
    this.version(3).stores({
      transactions: '++id, date, categoryId, type, recurringId',
      categories: '++id, name',
      budgets: '++id, categoryId, month',
      recurringExpenses: '++id, categoryId, isActive',
      classificationCache: '++id, memoPattern',
    });

    // 버전 4: 고정 수입 테이블 추가
    this.version(4).stores({
      transactions: '++id, date, categoryId, type, recurringId',
      categories: '++id, name',
      budgets: '++id, categoryId, month',
      recurringExpenses: '++id, categoryId, isActive',
      classificationCache: '++id, memoPattern',
      fixedIncomes: '++id, isActive',
    });

    // 버전 5: 소비 DNA + AI 코칭 캐시 테이블 추가
    this.version(5).stores({
      transactions: '++id, date, categoryId, type, recurringId',
      categories: '++id, name',
      budgets: '++id, categoryId, month',
      recurringExpenses: '++id, categoryId, isActive',
      classificationCache: '++id, memoPattern',
      fixedIncomes: '++id, isActive',
      spendingDNA: '++id, month',
      coachingCache: '++id, month',
    });
  }
}

// 싱글턴 DB 인스턴스 (브라우저 전용)
export const db = new GagaphooDatabase();
