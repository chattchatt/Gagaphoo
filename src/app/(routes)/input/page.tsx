'use client';

import { useState } from 'react';
import { parseCurrencyInput, formatCurrency } from '@/lib/format';

// 카테고리 placeholder 목록
const categories = [
  { id: 1, name: '식비', icon: '🍱' },
  { id: 2, name: '카페', icon: '☕' },
  { id: 3, name: '교통', icon: '🚇' },
  { id: 4, name: '쇼핑', icon: '🛍️' },
  { id: 5, name: '문화', icon: '🎬' },
  { id: 6, name: '기타', icon: '📌' },
];

export default function InputPage() {
  // 금액 입력 상태
  const [rawAmount, setRawAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // 숫자만 허용하는 금액 입력 핸들러
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
    setRawAmount(onlyNumbers);
  };

  // 표시용 금액 (쉼표 포함)
  const displayAmount = rawAmount
    ? Number(rawAmount).toLocaleString('ko-KR')
    : '';

  const parsedAmount = parseCurrencyInput(rawAmount);

  // 저장 핸들러 (placeholder)
  const handleSave = () => {
    if (!parsedAmount || !selectedCategory) return;
    // TODO: db.transactions.add({...}) 연동
    alert(`저장: ${formatCurrency(parsedAmount)} / ${memo}`);
  };

  const isValid = parsedAmount > 0 && selectedCategory !== null;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      {/* 상단 헤더 */}
      <div className="bg-white px-5 pt-6 pb-4 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900">지출 입력</h1>
      </div>

      <div className="px-4 py-6 space-y-5 max-w-lg mx-auto">
        {/* 금액 입력 — 큰 숫자, ₩ 기호 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="block text-sm text-gray-500 mb-2">금액</label>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-gray-400">₩</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={displayAmount}
              onChange={handleAmountChange}
              className="flex-1 text-4xl font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-200 min-w-0"
            />
          </div>
          {parsedAmount > 0 && (
            <p className="mt-1 text-sm text-gray-400">
              {formatCurrency(parsedAmount)}
            </p>
          )}
        </section>

        {/* 메모 입력 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="block text-sm text-gray-500 mb-2">메모</label>
          <input
            type="text"
            placeholder="어디에 사용했나요?"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            maxLength={50}
            className="w-full text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
          />
        </section>

        {/* 카테고리 선택 (placeholder) */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <label className="block text-sm text-gray-500 mb-3">카테고리</label>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                  selectedCategory === cat.id
                    ? 'border-[#3182F6] bg-[#EBF5FF]'
                    : 'border-transparent bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span
                  className={`text-xs font-medium ${
                    selectedCategory === cat.id ? 'text-[#3182F6]' : 'text-gray-600'
                  }`}
                >
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isValid}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition-all ${
            isValid
              ? 'bg-[#3182F6] text-white hover:bg-[#1B64DA] active:scale-[0.98]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}
