// POST /api/coaching — 월간 소비 데이터를 Gemini로 분석하여 AI 코칭 리포트 생성
import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { MonthlyAggregate } from '@/lib/coaching';

// AI 코칭 응답 구조
export interface CoachingResponse {
  insights: {
    title: string;
    description: string;
    category: string;
    changePercent: number;
  }[];
  patterns: {
    title: string;
    description: string;
    severity: 'warning' | 'info';
  }[];
  tips: {
    title: string;
    description: string;
    savingsEstimate: number;
  }[];
}

// 파싱 실패 시 반환할 기본 응답
function defaultResponse(): CoachingResponse {
  return {
    insights: [
      {
        title: '소비 분석 준비 중',
        description: '이번 달 소비 데이터를 분석하고 있습니다.',
        category: '전체',
        changePercent: 0,
      },
    ],
    patterns: [
      {
        title: '패턴 분석 불가',
        description: 'AI 분석 결과를 가져오지 못했습니다. 잠시 후 다시 시도해주세요.',
        severity: 'info',
      },
    ],
    tips: [
      {
        title: '지출 기록 유지',
        description: '꾸준한 지출 기록이 절약의 첫걸음입니다.',
        savingsEstimate: 0,
      },
    ],
  };
}

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  let body: { monthlyData?: unknown };
  try {
    const text = await request.text();
    body = JSON.parse(text) as { monthlyData?: unknown };
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  if (!body.monthlyData || typeof body.monthlyData !== 'object') {
    return Response.json({ error: 'monthlyData 필드가 필요합니다.' }, { status: 400 });
  }

  const monthlyData = body.monthlyData as MonthlyAggregate;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `당신은 개인 재무 코칭 전문가입니다. 아래 월간 소비 데이터를 분석하여 한국어로 소비 리포트를 작성해주세요.

월간 데이터:
- 대상 월: ${monthlyData.month}
- 총 수입: ${monthlyData.totalIncome.toLocaleString()}원
- 총 지출: ${monthlyData.totalExpense.toLocaleString()}원
- 순 저축: ${monthlyData.netSavings.toLocaleString()}원

카테고리별 지출 (전월 대비):
${monthlyData.categoryBreakdown
  .slice(0, 8)
  .map(
    (c) =>
      `  - ${c.name}: ${c.amount.toLocaleString()}원 (전월 ${c.prevAmount.toLocaleString()}원, ${c.changePercent > 0 ? '+' : ''}${c.changePercent}%)`
  )
  .join('\n')}

요일별 지출 분포:
${monthlyData.dayOfWeekDistribution.map((d) => `  - ${d.day}: ${d.amount.toLocaleString()}원`).join('\n')}

상위 지출 내역:
${monthlyData.topExpenses.map((e) => `  - ${e.date} ${e.category} [${e.memo}] ${e.amount.toLocaleString()}원`).join('\n')}

예산 대비 지출:
${monthlyData.budgetUsage.map((b) => `  - ${b.category}: 예산 ${b.budget.toLocaleString()}원 / 사용 ${b.spent.toLocaleString()}원 (${b.percent}%)`).join('\n')}

반드시 다음 JSON 형식으로만 응답하세요:
{
  "insights": [{"title": "제목", "description": "설명", "category": "카테고리명", "changePercent": 숫자}],
  "patterns": [{"title": "제목", "description": "설명", "severity": "warning|info"}],
  "tips": [{"title": "제목", "description": "설명", "savingsEstimate": 예상절약금액}]
}

insights는 3개, patterns는 1~2개, tips는 3개를 제공하세요.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // JSON 블록 추출 (마크다운 코드블록 대응)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(defaultResponse());
    }

    let parsed: CoachingResponse;
    try {
      parsed = JSON.parse(jsonMatch[0]) as CoachingResponse;
    } catch {
      return Response.json(defaultResponse());
    }

    // 응답 구조 검증 후 반환
    if (!Array.isArray(parsed.insights) || !Array.isArray(parsed.patterns) || !Array.isArray(parsed.tips)) {
      return Response.json(defaultResponse());
    }

    return Response.json(parsed);
  } catch (err) {
    console.error('[coaching] Gemini API 오류:', err);
    return Response.json(defaultResponse());
  }
}
