// AI 분류 결과 로컬 캐싱 (IndexedDB via Dexie)
import { db } from './db';

/**
 * 캐시에서 메모 패턴에 맞는 분류 결과 조회.
 * 존재하면 hitCount를 증가시키고 categoryId를 반환, 없으면 null.
 */
export async function getCachedClassification(memo: string): Promise<number | null> {
  const cached = await db.classificationCache
    .where('memoPattern')
    .equals(memo)
    .first();

  if (!cached) return null;

  await db.classificationCache.update(cached.id, {
    hitCount: cached.hitCount + 1,
    lastUsed: new Date(),
  });

  return cached.categoryId;
}

/**
 * 분류 결과를 캐시에 저장. 이미 존재하면 categoryId와 lastUsed를 갱신.
 */
export async function cacheClassification(memo: string, categoryId: number): Promise<void> {
  const existing = await db.classificationCache
    .where('memoPattern')
    .equals(memo)
    .first();

  if (existing) {
    await db.classificationCache.update(existing.id, {
      categoryId,
      lastUsed: new Date(),
    });
  } else {
    await db.classificationCache.add({
      id: undefined as unknown as number,
      memoPattern: memo,
      categoryId,
      hitCount: 0,
      lastUsed: new Date(),
    });
  }
}

/**
 * 사용자가 카테고리를 직접 수정했을 때 캐시를 갱신.
 */
export async function updateCacheOnUserCorrection(
  memo: string,
  newCategoryId: number
): Promise<void> {
  await cacheClassification(memo, newCategoryId);
}
