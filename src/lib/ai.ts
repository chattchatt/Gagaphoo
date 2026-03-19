// Gemini API를 사용한 거래 자동 분류 서비스
import { GoogleGenerativeAI } from '@google/generative-ai';

const CATEGORIES = [
  '식비', '카페/음료', '교통', '쇼핑', '생활', '의료',
  '문화/여가', '교육', '경조사', '구독/정기결제', '월세/주거',
  '기타수입', '급여', '기타',
];

export interface ClassifyResult {
  categoryName: string;
  confidence: number;
}

export async function classifyTransaction(
  memo: string,
  amount: number
): Promise<ClassifyResult> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `다음 거래 내역을 아래 카테고리 중 하나로 분류해줘. JSON 형식으로만 응답해.

카테고리 목록: ${CATEGORIES.join(', ')}

거래 메모: ${memo}
금액: ${amount}원

응답 형식 (JSON만, 다른 텍스트 없이):
{"categoryName": "카테고리명", "confidence": 0.0~1.0}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // JSON 블록 추출 (마크다운 코드블록 대응)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { categoryName: '기타', confidence: 0.5 };
    }

    const parsed = JSON.parse(jsonMatch[0]) as { categoryName: string; confidence: number };

    // 유효한 카테고리인지 검증
    if (!CATEGORIES.includes(parsed.categoryName)) {
      return { categoryName: '기타', confidence: 0.5 };
    }

    return {
      categoryName: parsed.categoryName,
      confidence: Math.min(1, Math.max(0, parsed.confidence)),
    };
  } catch {
    return { categoryName: '기타', confidence: 0 };
  }
}
