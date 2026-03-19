// 반복 지출 서비스 함수
import { db, type RecurringExpense } from './db';

/**
 * 활성화된 반복 지출 목록 조회
 */
export async function getActiveRecurring(): Promise<RecurringExpense[]> {
  return db.recurringExpenses.where('isActive').equals(1).toArray();
}

/**
 * 반복 지출 추가
 */
export async function addRecurring(
  data: Omit<RecurringExpense, 'id' | 'createdAt'>
): Promise<number> {
  return db.recurringExpenses.add({
    ...data,
    id: undefined as unknown as number,
    createdAt: new Date(),
  });
}

/**
 * 반복 지출 수정
 */
export async function updateRecurring(
  id: number,
  data: Partial<Omit<RecurringExpense, 'id' | 'createdAt'>>
): Promise<void> {
  await db.recurringExpenses.update(id, data);
}

/**
 * 반복 지출 삭제
 */
export async function deleteRecurring(id: number): Promise<void> {
  await db.recurringExpenses.delete(id);
}

/**
 * 오늘 날짜에 해당하는 반복 지출을 Transaction으로 자동 기록.
 * 이미 오늘 동일 recurringId로 기록된 항목은 건너뜀 (중복 방지).
 * 반환: 새로 기록된 건수
 */
export async function processRecurringExpenses(): Promise<number> {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dayOfMonth = today.getDate();
  const dayOfWeek = today.getDay(); // 0=일, 6=토

  const actives = await getActiveRecurring();
  let created = 0;

  for (const rec of actives) {
    // 오늘 해당하는 반복인지 확인
    const isToday =
      (rec.cycle === 'monthly' && rec.dayOfMonth === dayOfMonth) ||
      (rec.cycle === 'weekly' && rec.dayOfWeek === dayOfWeek);

    if (!isToday) continue;

    // 중복 방지: 오늘 이미 해당 recurringId로 기록된 항목 확인
    const existing = await db.transactions
      .where('recurringId')
      .equals(rec.id)
      .filter((t) => t.date === todayStr)
      .first();

    if (existing) continue;

    // Transaction 기록
    await db.transactions.add({
      id: undefined as unknown as number,
      amount: rec.amount,
      memo: rec.memo,
      categoryId: rec.categoryId,
      type: 'expense',
      date: todayStr,
      aiClassified: false,
      userModified: false,
      recurringId: rec.id,
      createdAt: new Date(),
    });
    created++;
  }

  return created;
}
