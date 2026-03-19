// 금액·날짜 포맷 유틸리티 함수

/**
 * 금액을 한국 원화 형식으로 포맷
 * @example formatCurrency(1234567) → "₩1,234,567"
 */
export function formatCurrency(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

/**
 * 날짜 문자열(YYYY-MM-DD) 또는 Date 객체를 YYYY.MM.DD 형식으로 포맷
 * @example formatDate("2024-03-19") → "2024.03.19"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd}`;
}

/**
 * 사용자 입력 문자열에서 숫자만 추출해 금액으로 반환
 * 쉼표, 원화 기호, 공백 등을 제거하고 정수로 변환
 * @example parseCurrencyInput("₩1,234,567") → 1234567
 * @example parseCurrencyInput("12000원") → 12000
 */
export function parseCurrencyInput(input: string): number {
  // 숫자와 소수점만 남기고 모두 제거
  const cleaned = input.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  // 소수점이 있으면 반올림하여 정수 반환
  return Math.round(parseFloat(cleaned));
}
