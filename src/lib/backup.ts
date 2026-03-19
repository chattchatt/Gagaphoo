// 데이터 백업/복원 유틸리티
import { db, type Transaction, type Category, type Budget, type RecurringExpense, type ClassificationCache } from './db';

// 백업 파일 구조
export interface BackupData {
  version: number;
  exportedAt: string; // ISO 8601
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  recurringExpenses: RecurringExpense[];
  classificationCache: ClassificationCache[];
}

// 전체 데이터 JSON으로 내보내기
export async function exportData(): Promise<BackupData> {
  const [transactions, categories, budgets, recurringExpenses, classificationCache] =
    await Promise.all([
      db.transactions.toArray(),
      db.categories.toArray(),
      db.budgets.toArray(),
      db.recurringExpenses.toArray(),
      db.classificationCache.toArray(),
    ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    categories,
    budgets,
    recurringExpenses,
    classificationCache,
  };
}

// 데이터 가져오기 (병합 또는 덮어쓰기)
export async function importData(
  json: string,
  mode: 'merge' | 'overwrite'
): Promise<void> {
  let backup: BackupData;

  try {
    backup = JSON.parse(json) as BackupData;
  } catch {
    throw new Error('유효하지 않은 JSON 파일입니다.');
  }

  // 필수 필드 검증
  if (
    !backup.version ||
    !backup.exportedAt ||
    !Array.isArray(backup.transactions) ||
    !Array.isArray(backup.categories) ||
    !Array.isArray(backup.budgets) ||
    !Array.isArray(backup.recurringExpenses) ||
    !Array.isArray(backup.classificationCache)
  ) {
    throw new Error('백업 파일 형식이 올바르지 않습니다.');
  }

  await db.transaction(
    'rw',
    [
      db.transactions,
      db.categories,
      db.budgets,
      db.recurringExpenses,
      db.classificationCache,
    ],
    async () => {
      if (mode === 'overwrite') {
        // 기존 데이터 전체 삭제 후 복원
        await Promise.all([
          db.transactions.clear(),
          db.categories.clear(),
          db.budgets.clear(),
          db.recurringExpenses.clear(),
          db.classificationCache.clear(),
        ]);

        await Promise.all([
          db.transactions.bulkAdd(backup.transactions),
          db.categories.bulkAdd(backup.categories),
          db.budgets.bulkAdd(backup.budgets),
          db.recurringExpenses.bulkAdd(backup.recurringExpenses),
          db.classificationCache.bulkAdd(backup.classificationCache),
        ]);
      } else {
        // 병합: 중복 id는 put으로 덮어쓰기
        await Promise.all([
          db.transactions.bulkPut(backup.transactions),
          db.categories.bulkPut(backup.categories),
          db.budgets.bulkPut(backup.budgets),
          db.recurringExpenses.bulkPut(backup.recurringExpenses),
          db.classificationCache.bulkPut(backup.classificationCache),
        ]);
      }
    }
  );
}

// JSON을 파일로 다운로드
export function downloadAsFile(data: BackupData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const filename = `gagaphoo-backup-${dateStr}.json`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

// 백업 데이터 요약 반환 (건수)
export function summarizeBackup(data: BackupData): {
  transactions: number;
  categories: number;
  budgets: number;
  recurringExpenses: number;
} {
  return {
    transactions: data.transactions.length,
    categories: data.categories.length,
    budgets: data.budgets.length,
    recurringExpenses: data.recurringExpenses.length,
  };
}
