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

// Dexie 데이터베이스 클래스 정의
class GagaphooDatabase extends Dexie {
  transactions!: EntityTable<Transaction, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  recurringExpenses!: EntityTable<RecurringExpense, 'id'>;

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
  }
}

// 싱글턴 DB 인스턴스 (브라우저 전용)
export const db = new GagaphooDatabase();
