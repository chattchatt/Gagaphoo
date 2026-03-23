// 예산 관련 유틸리티 함수
import { db } from './db';

/**
 * 활성화된 고정 수입 합계 반환
 */
export async function getFixedIncomeTotal(): Promise<number> {
  const incomes = await db.fixedIncomes.filter((i) => i.isActive === true).toArray();
  return incomes.reduce((sum, i) => sum + i.amount, 0);
}

/**
 * 예산 vs 수입 비교 리포트
 * 반환: { categoryId, categoryName, budgetAmount, budgetPct, spentAmount, spentPct }[]
 * + summary: { totalIncome, totalBudget, totalSpent, savingsRate }
 */
export async function getBudgetVsIncomeReport(month: string): Promise<{
  rows: {
    categoryId: number;
    categoryName: string;
    categoryIcon: string;
    categoryColor: string;
    budgetAmount: number;
    budgetPct: number;
    spentAmount: number;
    spentPct: number;
  }[];
  summary: {
    totalIncome: number;
    totalBudget: number;
    totalSpent: number;
    savingsRate: number;
  };
}> {
  const [incomes, budgets, transactions, categories] = await Promise.all([
    db.fixedIncomes.filter((i) => i.isActive === true).toArray(),
    db.budgets.where('month').equals(month).toArray(),
    db.transactions
      .where('date')
      .startsWith(month)
      .filter((t) => t.type === 'expense')
      .toArray(),
    db.categories.toArray(),
  ]);

  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);

  // 카테고리별 지출 합산
  const spentMap = new Map<number, number>();
  for (const t of transactions) {
    spentMap.set(t.categoryId, (spentMap.get(t.categoryId) ?? 0) + t.amount);
  }

  const totalSpent = Array.from(spentMap.values()).reduce((sum, v) => sum + v, 0);
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalSpent) / totalIncome) * 100) : 0;

  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  const rows = budgets.map((b) => {
    const cat = categoryMap.get(b.categoryId);
    const spentAmount = spentMap.get(b.categoryId) ?? 0;
    const budgetPct = totalIncome > 0 ? Math.round((b.amount / totalIncome) * 100) : 0;
    const spentPct = totalIncome > 0 ? Math.round((spentAmount / totalIncome) * 100) : 0;
    return {
      categoryId: b.categoryId,
      categoryName: cat?.name ?? '',
      categoryIcon: cat?.icon ?? '',
      categoryColor: cat?.color ?? '#999',
      budgetAmount: b.amount,
      budgetPct,
      spentAmount,
      spentPct,
    };
  });

  return {
    rows,
    summary: { totalIncome, totalBudget, totalSpent, savingsRate },
  };
}

/**
 * 특정 월의 전체 예산 목록 조회
 * @param month YYYY-MM 형식
 */
export async function getBudgetForMonth(month: string) {
  return db.budgets.where('month').equals(month).toArray();
}

/**
 * 카테고리별 예산 upsert (있으면 업데이트, 없으면 추가)
 * amount가 0이면 해당 예산 레코드를 삭제한다.
 */
export async function upsertBudget(
  categoryId: number,
  month: string,
  amount: number
): Promise<void> {
  const existing = await db.budgets
    .where('[categoryId+month]')
    .equals([categoryId, month])
    .first()
    .catch(() => undefined);

  // 복합 인덱스가 없을 경우 fallback: 전체 해당 월 예산에서 수동 필터
  const record =
    existing ??
    (await db.budgets
      .where('month')
      .equals(month)
      .filter((b) => b.categoryId === categoryId)
      .first());

  if (amount === 0) {
    if (record?.id) await db.budgets.delete(record.id);
    return;
  }

  if (record) {
    await db.budgets.update(record.id, { amount });
  } else {
    await db.budgets.add({
      id: undefined as unknown as number,
      categoryId,
      month,
      amount,
    });
  }
}

/**
 * 월별 카테고리별 예산 대비 지출 현황
 * 반환: { categoryId, budget, spent, percent }[]
 */
export async function getBudgetUsage(
  month: string
): Promise<{ categoryId: number; budget: number; spent: number; percent: number }[]> {
  const [budgets, transactions] = await Promise.all([
    db.budgets.where('month').equals(month).toArray(),
    db.transactions
      .where('date')
      .startsWith(month)
      .filter((t) => t.type === 'expense')
      .toArray(),
  ]);

  // 카테고리별 지출 합산
  const spentMap = new Map<number, number>();
  for (const t of transactions) {
    spentMap.set(t.categoryId, (spentMap.get(t.categoryId) ?? 0) + t.amount);
  }

  return budgets.map((b) => {
    const spent = spentMap.get(b.categoryId) ?? 0;
    const percent = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
    return { categoryId: b.categoryId, budget: b.amount, spent, percent };
  });
}

/**
 * 80% / 100% 임계값 도달 카테고리 목록 반환
 * 반환: { categoryId, categoryName, percent, threshold: 80 | 100 }[]
 */
export async function checkBudgetThresholds(
  month: string
): Promise<{ categoryId: number; categoryName: string; percent: number; threshold: 80 | 100 }[]> {
  const [usages, categories] = await Promise.all([
    getBudgetUsage(month),
    db.categories.toArray(),
  ]);

  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const alerts: { categoryId: number; categoryName: string; percent: number; threshold: 80 | 100 }[] = [];

  for (const u of usages) {
    const categoryName = categoryMap.get(u.categoryId) ?? '';
    if (u.percent >= 100) {
      alerts.push({ categoryId: u.categoryId, categoryName, percent: u.percent, threshold: 100 });
    } else if (u.percent >= 80) {
      alerts.push({ categoryId: u.categoryId, categoryName, percent: u.percent, threshold: 80 });
    }
  }

  return alerts;
}
