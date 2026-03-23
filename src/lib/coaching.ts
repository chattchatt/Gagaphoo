// AI 코칭을 위한 월간 데이터 집계 및 IndexedDB 캐시 관리
import { db } from './db';

// 월간 집계 결과 인터페이스
export interface MonthlyAggregate {
  month: string;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  categoryBreakdown: {
    name: string;
    amount: number;
    prevAmount: number;
    changePercent: number;
  }[];
  dayOfWeekDistribution: {
    day: string;
    amount: number;
  }[]; // 월~일 순
  topExpenses: {
    memo: string;
    amount: number;
    category: string;
    date: string;
  }[];
  budgetUsage: {
    category: string;
    budget: number;
    spent: number;
    percent: number;
  }[];
}

// 코칭 캐시 인터페이스 (IndexedDB에 저장)
interface CoachingCacheEntry {
  month: string;
  content: string;
  cachedAt: number; // timestamp
}

const COACHING_CACHE_KEY_PREFIX = 'coaching_cache_';
const COACHING_CACHE_STORE = 'coachingCache';

// IndexedDB 직접 접근 (Dexie가 관리하지 않는 별도 store는 없으므로 localStorage fallback 사용)
// worker-1이 CoachingCache 테이블을 추가할 예정이므로, 그 전까지는 localStorage 사용

/**
 * IndexedDB 캐시에서 코칭 결과 조회.
 * worker-1의 CoachingCache 테이블이 준비되면 db.coachingCache를 사용.
 * 현재는 localStorage fallback.
 */
export async function getCachedCoaching(month: string): Promise<string | null> {
  try {
    // CoachingCache 테이블이 db에 추가된 경우 사용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbAny = db as any;
    if (dbAny.coachingCache) {
      const cached = await dbAny.coachingCache
        .where('month')
        .equals(month)
        .first();
      if (cached) return cached.content as string;
      return null;
    }
  } catch {
    // CoachingCache 테이블 미존재 시 fallback
  }

  // localStorage fallback (브라우저 환경에서만)
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(COACHING_CACHE_KEY_PREFIX + month);
  if (!raw) return null;
  try {
    const entry = JSON.parse(raw) as CoachingCacheEntry;
    // 7일 이내 캐시만 유효
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - entry.cachedAt > sevenDays) {
      localStorage.removeItem(COACHING_CACHE_KEY_PREFIX + month);
      return null;
    }
    return entry.content;
  } catch {
    return null;
  }
}

/**
 * 코칭 결과를 캐시에 저장.
 * worker-1의 CoachingCache 테이블이 준비되면 db.coachingCache를 사용.
 * 현재는 localStorage fallback.
 */
export async function saveCoachingCache(month: string, content: string): Promise<void> {
  try {
    // CoachingCache 테이블이 db에 추가된 경우 사용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dbAny = db as any;
    if (dbAny.coachingCache) {
      const existing = await dbAny.coachingCache
        .where('month')
        .equals(month)
        .first();
      if (existing) {
        await dbAny.coachingCache.update(existing.id, { content, cachedAt: new Date() });
      } else {
        await dbAny.coachingCache.add({
          id: undefined,
          month,
          content,
          cachedAt: new Date(),
        });
      }
      return;
    }
  } catch {
    // CoachingCache 테이블 미존재 시 fallback
  }

  // localStorage fallback (브라우저 환경에서만)
  if (typeof window === 'undefined') return;
  const entry: CoachingCacheEntry = { month, content, cachedAt: Date.now() };
  localStorage.setItem(COACHING_CACHE_KEY_PREFIX + month, JSON.stringify(entry));
}

/**
 * YYYY-MM 형식의 month에서 전월 YYYY-MM 반환
 */
function getPrevMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number);
  const d = new Date(year, mon - 1, 1);
  d.setMonth(d.getMonth() - 1);
  const py = d.getFullYear();
  const pm = String(d.getMonth() + 1).padStart(2, '0');
  return `${py}-${pm}`;
}

const DAY_NAMES = ['월', '화', '수', '목', '금', '토', '일'];

/**
 * 특정 월의 소비 데이터를 집계하여 AI 코칭용 MonthlyAggregate 반환.
 * 전월 데이터도 조회하여 카테고리별 증감률을 계산한다.
 */
export async function aggregateMonthlyData(month: string): Promise<MonthlyAggregate> {
  const prevMonth = getPrevMonth(month);

  // 병렬 조회: 해당 월 거래, 전월 거래, 카테고리, 예산
  const [transactions, prevTransactions, categories, budgets] = await Promise.all([
    db.transactions.where('date').startsWith(month).toArray(),
    db.transactions.where('date').startsWith(prevMonth).toArray(),
    db.categories.toArray(),
    db.budgets.where('month').equals(month).toArray(),
  ]);

  // 카테고리 id -> 객체 맵
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  // 수입/지출 합계
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netSavings = totalIncome - totalExpense;

  // 이번 달 카테고리별 지출 합산
  const categorySpentMap = new Map<number, number>();
  for (const t of transactions.filter((t) => t.type === 'expense')) {
    categorySpentMap.set(t.categoryId, (categorySpentMap.get(t.categoryId) ?? 0) + t.amount);
  }

  // 전월 카테고리별 지출 합산
  const prevCategorySpentMap = new Map<number, number>();
  for (const t of prevTransactions.filter((t) => t.type === 'expense')) {
    prevCategorySpentMap.set(t.categoryId, (prevCategorySpentMap.get(t.categoryId) ?? 0) + t.amount);
  }

  // 카테고리 breakdown (지출 있는 카테고리만, 금액 내림차순)
  const categoryBreakdown = Array.from(categorySpentMap.entries())
    .map(([catId, amount]) => {
      const cat = categoryMap.get(catId);
      const prevAmount = prevCategorySpentMap.get(catId) ?? 0;
      const changePercent =
        prevAmount > 0 ? Math.round(((amount - prevAmount) / prevAmount) * 100) : 0;
      return {
        name: cat?.name ?? '기타',
        amount,
        prevAmount,
        changePercent,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // 요일별 지출 분포 (월=0 ~ 일=6, JS Date는 일=0 ~ 토=6이므로 변환)
  const dayMap = new Array<number>(7).fill(0);
  for (const t of transactions.filter((t) => t.type === 'expense')) {
    const d = new Date(t.date);
    // JS: 0=일, 1=월 ... 6=토 → 우리: 0=월 ... 6=일
    const jsDay = d.getDay(); // 0=일
    const idx = jsDay === 0 ? 6 : jsDay - 1; // 일요일은 index 6
    dayMap[idx] += t.amount;
  }
  const dayOfWeekDistribution = DAY_NAMES.map((day, i) => ({
    day,
    amount: dayMap[i],
  }));

  // TOP 5 단건 지출
  const topExpenses = transactions
    .filter((t) => t.type === 'expense')
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((t) => ({
      memo: t.memo,
      amount: t.amount,
      category: categoryMap.get(t.categoryId)?.name ?? '기타',
      date: t.date,
    }));

  // 예산 사용률
  const budgetUsage = budgets.map((b) => {
    const cat = categoryMap.get(b.categoryId);
    const spent = categorySpentMap.get(b.categoryId) ?? 0;
    const percent = b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
    return {
      category: cat?.name ?? '기타',
      budget: b.amount,
      spent,
      percent,
    };
  });

  return {
    month,
    totalIncome,
    totalExpense,
    netSavings,
    categoryBreakdown,
    dayOfWeekDistribution,
    topExpenses,
    budgetUsage,
  };
}
