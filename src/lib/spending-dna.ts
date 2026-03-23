// 소비 DNA 분석 엔진: 거래 데이터 기반 5축 점수 + 유형 결정
import { db } from './db';

// 5축 소비 점수 (0~100)
export interface DNAScores {
  saving: number;      // 저축 성향 (지출 대비 저축률)
  planning: number;    // 계획성 (고정 지출 비율)
  diversity: number;   // 다양성 (카테고리 분산도)
  impulse: number;     // 충동 소비 (비정기 지출 빈도)
  investment: number;  // 투자 성향 (투자 카테고리 비율)
}

// 소비 유형 식별자
export type DNAType =
  | 'planner'    // 계획형
  | 'emotional'  // 감성형
  | 'subscriber' // 구독형
  | 'foodie'     // 미식형
  | 'investor'   // 투자형
  | 'balanced';  // 균형형

// 유형별 메타 정보
export const TYPE_INFO: Record<DNAType, { name: string; icon: string; description: string; advice: string }> = {
  planner: {
    name: '계획형',
    icon: '📋',
    description: '지출을 체계적으로 관리하며 예산 내에서 생활합니다.',
    advice: '비상금 계좌를 별도로 운용하면 돌발 지출에 더 잘 대응할 수 있어요.',
  },
  emotional: {
    name: '감성형',
    icon: '🛍️',
    description: '기분과 감정에 따라 소비하는 경향이 있습니다.',
    advice: '큰 구매 전 24시간 대기 규칙을 적용해보세요.',
  },
  subscriber: {
    name: '구독형',
    icon: '📦',
    description: '구독 서비스와 정기 결제가 지출의 큰 비중을 차지합니다.',
    advice: '사용하지 않는 구독을 정리하면 월 고정비를 줄일 수 있어요.',
  },
  foodie: {
    name: '미식형',
    icon: '🍽️',
    description: '식비와 외식에 높은 비중을 투자합니다.',
    advice: '주 1~2회 홈쿡 루틴을 만들면 지출 균형을 맞출 수 있어요.',
  },
  investor: {
    name: '투자형',
    icon: '📈',
    description: '미래를 위한 투자와 자산 형성에 적극적입니다.',
    advice: '생활비 버퍼를 유지하면서 투자 비율을 조정해보세요.',
  },
  balanced: {
    name: '균형형',
    icon: '⚖️',
    description: '소비 패턴이 전반적으로 균형 잡혀 있습니다.',
    advice: '현재 패턴을 유지하면서 저축 목표를 조금씩 높여보세요.',
  },
};

// 최근 N개월 거래 데이터를 가져오는 헬퍼
async function getRecentTransactions(monthCount: number) {
  const now = new Date();
  const cutoffDate = new Date(now.getFullYear(), now.getMonth() - monthCount, 1);
  const cutoffStr = cutoffDate.toISOString().slice(0, 10); // YYYY-MM-DD

  return db.transactions.where('date').aboveOrEqual(cutoffStr).toArray();
}

// 5축 DNA 점수 계산 (최근 3개월 거래 기반)
export async function calculateDNAScores(): Promise<DNAScores> {
  const transactions = await getRecentTransactions(3);

  const expenses = transactions.filter((t) => t.type === 'expense');
  const incomes = transactions.filter((t) => t.type === 'income');

  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);

  // --- saving: 저축 성향 ---
  // 수입 대비 지출 비율이 낮을수록 저축 성향 높음
  const expenseRatio = totalIncome > 0 ? totalExpense / totalIncome : 1;
  const saving = Math.round(Math.max(0, Math.min(100, (1 - expenseRatio) * 100 + 30)));

  // --- planning: 계획성 ---
  // recurringId가 있는(정기) 지출 비율
  const recurringExpenses = expenses.filter((t) => t.recurringId != null);
  const recurringAmount = recurringExpenses.reduce((sum, t) => sum + t.amount, 0);
  const planning = totalExpense > 0
    ? Math.round(Math.min(100, (recurringAmount / totalExpense) * 100))
    : 50;

  // --- diversity: 다양성 ---
  // 카테고리 종류 수 기반 (최대 10개 카테고리 가정)
  const categorySet = new Set(expenses.map((t) => t.categoryId));
  const diversity = Math.round(Math.min(100, (categorySet.size / 10) * 100));

  // --- impulse: 충동 소비 ---
  // 비정기 + AI 분류 + 사용자 미수정 항목 비율
  const impulseExpenses = expenses.filter((t) => t.recurringId == null && t.aiClassified && !t.userModified);
  const impulseAmount = impulseExpenses.reduce((sum, t) => sum + t.amount, 0);
  const impulse = totalExpense > 0
    ? Math.round(Math.min(100, (impulseAmount / totalExpense) * 100))
    : 20;

  // --- investment: 투자 성향 ---
  // 카테고리명에 '투자', '저축', '주식' 등이 포함된 항목 비율 (categoryId 기반 근사치)
  // 실제 카테고리 이름을 조회해서 판단
  const allCategories = await db.categories.toArray();
  const investmentKeywords = ['투자', '저축', '주식', '펀드', '보험'];
  const investmentCategoryIds = new Set(
    allCategories
      .filter((c) => investmentKeywords.some((kw) => c.name.includes(kw)))
      .map((c) => c.id)
  );
  const investmentAmount = expenses
    .filter((t) => investmentCategoryIds.has(t.categoryId))
    .reduce((sum, t) => sum + t.amount, 0);
  const investment = totalExpense > 0
    ? Math.round(Math.min(100, (investmentAmount / totalExpense) * 150)) // 가중치 1.5배
    : 10;

  return { saving, planning, diversity, impulse, investment };
}

// 주/부 유형 결정
export function determineType(scores: DNAScores): { primaryType: DNAType; secondaryType: DNAType } {
  // 각 축과 유형의 연관 가중치
  const typeScores: Record<DNAType, number> = {
    planner: scores.planning * 0.5 + scores.saving * 0.3 + (100 - scores.impulse) * 0.2,
    emotional: scores.impulse * 0.6 + scores.diversity * 0.4,
    subscriber: scores.planning * 0.7 + (100 - scores.diversity) * 0.3,
    foodie: scores.diversity * 0.5 + (100 - scores.saving) * 0.3 + scores.impulse * 0.2,
    investor: scores.investment * 0.7 + scores.saving * 0.3,
    balanced:
      100 -
      Math.max(
        Math.abs(scores.saving - 50),
        Math.abs(scores.planning - 50),
        Math.abs(scores.diversity - 50),
        Math.abs(scores.impulse - 50),
        Math.abs(scores.investment - 50)
      ),
  };

  const sorted = (Object.entries(typeScores) as [DNAType, number][]).sort((a, b) => b[1] - a[1]);
  const primaryType = sorted[0][0];
  const secondaryType = sorted[1][0];

  return { primaryType, secondaryType };
}

// DNA 결과를 IndexedDB에 저장
export async function saveDNAResult(
  month: string,
  scores: DNAScores,
  primaryType: DNAType,
  secondaryType: DNAType
): Promise<void> {
  // 같은 월 데이터가 있으면 교체
  const existing = await db.spendingDNA.where('month').equals(month).first();
  if (existing) {
    await db.spendingDNA.update(existing.id, {
      scores: JSON.stringify(scores),
      primaryType,
      secondaryType,
      createdAt: new Date(),
    });
  } else {
    await db.spendingDNA.add({
      month,
      scores: JSON.stringify(scores),
      primaryType,
      secondaryType,
      createdAt: new Date(),
    } as Omit<import('./db').SpendingDNA, 'id'>);
  }
}

// 전체 DNA 히스토리 조회 (최신 순)
export async function getDNAHistory() {
  const records = await db.spendingDNA.orderBy('month').reverse().toArray();
  return records.map((r) => ({
    ...r,
    scores: JSON.parse(r.scores) as DNAScores,
  }));
}
