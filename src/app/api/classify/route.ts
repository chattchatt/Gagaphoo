// POST /api/classify — 거래 메모를 AI로 분류
// 캐시 우선 조회 → 없으면 Claude API 호출
import { NextRequest } from 'next/server';
import { classifyTransaction } from '@/lib/ai';
import { getCachedClassification, cacheClassification } from '@/lib/ai-cache';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  let body: { memo?: unknown; amount?: unknown };
  try {
    body = await request.json() as { memo?: unknown; amount?: unknown };
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const memo = typeof body.memo === 'string' ? body.memo.trim() : '';
  const amount = typeof body.amount === 'number' ? body.amount : 0;

  if (!memo) {
    return Response.json({ error: 'memo 필드가 필요합니다.' }, { status: 400 });
  }

  // 1. 캐시 먼저 확인
  const cachedCategoryId = await getCachedClassification(memo);
  if (cachedCategoryId !== null) {
    const category = await db.categories.get(cachedCategoryId);
    return Response.json({
      categoryName: category?.name ?? '기타',
      confidence: 1.0,
      cached: true,
    });
  }

  // 2. AI 호출
  const result = await classifyTransaction(memo, amount);

  // 3. 결과를 캐시에 저장 (카테고리 이름 → ID 변환)
  const category = await db.categories.where('name').equals(result.categoryName).first();
  if (category) {
    await cacheClassification(memo, category.id);
  }

  return Response.json({
    categoryName: result.categoryName,
    confidence: result.confidence,
    cached: false,
  });
}
