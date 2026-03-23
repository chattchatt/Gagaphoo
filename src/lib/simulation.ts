// 시뮬레이션 엔진: 평균 수입/지출 기반 미래 저축 예측 및 목표 기간 산출
import { db } from './db';

// 월별 평균 수입/지출 요약
export interface MonthlyAverage {
  income: number;
  expense: number;
  savings: number;
  categoryBreakdown: { categoryId: number; name: string; amount: number }[];
}

// 월별 조정 값 (시뮬레이션 파라미터)
export interface MonthlyAdjustments {
  incomeChange?: number;   // 월 수입 증감 (절대값, 음수 가능)
  expenseChange?: number;  // 월 지출 증감 (절대값, 음수 가능)
}

// YYYY-MM 형식 날짜 생성 헬퍼
function getMonthStr(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

// 최근 N개월의 평균 수입/지출/카테고리별 금액 산출
export async function getAverageMonthly(monthCount: number): Promise<MonthlyAverage> {
  const now = new Date();
  const months: string[] = [];

  for (let i = 1; i <= monthCount; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getMonthStr(d.getFullYear(), d.getMonth()));
  }

  const transactions = await db.transactions.toArray();
  const categories = await db.categories.toArray();
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // 대상 월 필터링
  const filtered = transactions.filter((t) => months.some((m) => t.date.startsWith(m)));

  const totalIncome = filtered
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filtered
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // 카테고리별 지출 집계
  const categoryTotals = new Map<number, number>();
  filtered
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      categoryTotals.set(t.categoryId, (categoryTotals.get(t.categoryId) ?? 0) + t.amount);
    });

  const categoryBreakdown = Array.from(categoryTotals.entries()).map(([categoryId, amount]) => ({
    categoryId,
    name: categoryMap.get(categoryId) ?? '기타',
    amount: Math.round(amount / monthCount),
  }));

  const avgIncome = Math.round(totalIncome / monthCount);
  const avgExpense = Math.round(totalExpense / monthCount);

  return {
    income: avgIncome,
    expense: avgExpense,
    savings: avgIncome - avgExpense,
    categoryBreakdown,
  };
}

// 월별 누적 저축 배열 반환 (months개월 예측)
export async function projectSavings(
  months: number,
  adjustments?: MonthlyAdjustments
): Promise<number[]> {
  const avg = await getAverageMonthly(3);

  const monthlyIncome = avg.income + (adjustments?.incomeChange ?? 0);
  const monthlyExpense = avg.expense + (adjustments?.expenseChange ?? 0);
  const monthlySavings = monthlyIncome - monthlyExpense;

  // 현재 잔액을 0으로 두고 누적 저축만 계산 (상대적 예측)
  const result: number[] = [];
  let cumulative = 0;

  for (let i = 0; i < months; i++) {
    cumulative += monthlySavings;
    result.push(Math.round(cumulative));
  }

  return result;
}

// 목표 금액 도달까지 걸리는 개월 수 반환
export async function calculateGoalTimeline(
  targetAmount: number,
  adjustments?: MonthlyAdjustments
): Promise<{ months: number; achievable: boolean }> {
  const avg = await getAverageMonthly(3);

  const monthlyIncome = avg.income + (adjustments?.incomeChange ?? 0);
  const monthlyExpense = avg.expense + (adjustments?.expenseChange ?? 0);
  const monthlySavings = monthlyIncome - monthlyExpense;

  if (monthlySavings <= 0) {
    // 저축이 음수면 목표 불가
    return { months: -1, achievable: false };
  }

  const months = Math.ceil(targetAmount / monthlySavings);
  return { months, achievable: true };
}

// 카테고리별 월평균 금액 순 랭킹 (지출 많은 순)
export async function getCategoryImpact(): Promise<
  { categoryId: number; name: string; monthlyAverage: number; percentage: number }[]
> {
  const avg = await getAverageMonthly(3);

  const total = avg.categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);

  return avg.categoryBreakdown
    .sort((a, b) => b.amount - a.amount)
    .map((c) => ({
      categoryId: c.categoryId,
      name: c.name,
      monthlyAverage: c.amount,
      percentage: total > 0 ? Math.round((c.amount / total) * 100) : 0,
    }));
}
