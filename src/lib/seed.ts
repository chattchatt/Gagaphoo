// 기본 카테고리 시드 데이터 및 DB 초기화 함수
import { db, type Category } from './db';

// 기본 카테고리 목록 (id 제외 — Dexie가 자동 부여)
const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: '식비',           icon: '🍚', color: '#FF6B6B', isDefault: true },
  { name: '카페/음료',      icon: '☕', color: '#C8956C', isDefault: true },
  { name: '교통',           icon: '🚌', color: '#4ECDC4', isDefault: true },
  { name: '쇼핑',           icon: '🛍️', color: '#A78BFA', isDefault: true },
  { name: '생활',           icon: '🏠', color: '#60A5FA', isDefault: true },
  { name: '의료',           icon: '🏥', color: '#F87171', isDefault: true },
  { name: '문화/여가',      icon: '🎬', color: '#34D399', isDefault: true },
  { name: '교육',           icon: '📚', color: '#FBBF24', isDefault: true },
  { name: '경조사',         icon: '🎁', color: '#F472B6', isDefault: true },
  { name: '구독/정기결제',  icon: '🔄', color: '#818CF8', isDefault: true },
  { name: '월세/주거',      icon: '🏢', color: '#6EE7B7', isDefault: true },
  { name: '기타수입',       icon: '💰', color: '#86EFAC', isDefault: true },
  { name: '급여',           icon: '💳', color: '#4ADE80', isDefault: true },
  { name: '기타',           icon: '📌', color: '#94A3B8', isDefault: true },
];

/**
 * DB 최초 실행 시 기본 카테고리를 삽입하는 초기화 함수.
 * 이미 카테고리가 존재하면 아무 작업도 하지 않는다 (멱등성 보장).
 */
export async function initializeDB(): Promise<void> {
  // 기존 카테고리가 있으면 스킵
  const existingCount = await db.categories.count();
  if (existingCount > 0) return;

  // 기본 카테고리 일괄 삽입
  await db.categories.bulkAdd(DEFAULT_CATEGORIES as Category[]);
}
