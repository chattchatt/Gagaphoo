// POST /api/classify — 거래 메모를 AI(Gemini)로 분류
// 캐시는 클라이언트(IndexedDB)에서 처리, 서버는 AI 호출만 담당
import { NextRequest } from 'next/server';
import { classifyTransaction } from '@/lib/ai';

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return Response.json(
      { error: 'GEMINI_API_KEY 환경변수가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  let body: { memo?: unknown; amount?: unknown };
  try {
    const text = await request.text();
    body = JSON.parse(text) as { memo?: unknown; amount?: unknown };
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
  }

  const memo = typeof body.memo === 'string' ? body.memo.trim() : '';
  const amount = typeof body.amount === 'number' ? body.amount : 0;

  if (!memo) {
    return Response.json({ error: 'memo 필드가 필요합니다.' }, { status: 400 });
  }

  const result = await classifyTransaction(memo, amount);

  return Response.json({
    categoryName: result.categoryName,
    confidence: result.confidence,
    cached: false,
  });
}
