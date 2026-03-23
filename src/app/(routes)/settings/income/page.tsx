'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type FixedIncome } from '@/lib/db';
import { parseCurrencyInput } from '@/lib/format';

// 토스트 컴포넌트
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 1500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap">
      {message}
    </div>
  );
}

export default function IncomeSettingsPage() {
  const router = useRouter();

  // 새 수입 입력 폼 상태
  const [amountInput, setAmountInput] = useState('');
  const [memoInput, setMemoInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 고정 수입 목록 (실시간)
  const fixedIncomes = useLiveQuery<FixedIncome[]>(
    () => db.fixedIncomes.toArray(),
    []
  );

  // 활성 수입 합계
  const activeTotal = fixedIncomes
    ?.filter((i) => i.isActive)
    .reduce((sum, i) => sum + i.amount, 0) ?? 0;

  // 금액 입력 핸들러 (숫자만, 천단위 쉼표)
  const handleAmountChange = (value: string) => {
    const onlyNumbers = value.replace(/[^0-9]/g, '');
    const formatted = onlyNumbers ? Number(onlyNumbers).toLocaleString('ko-KR') : '';
    setAmountInput(formatted);
  };

  // 새 고정 수입 추가
  const handleAdd = async () => {
    const amount = parseCurrencyInput(amountInput);
    const memo = memoInput.trim();

    if (amount <= 0) {
      setToast('금액을 입력해주세요.');
      return;
    }
    if (!memo) {
      setToast('메모를 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      await db.fixedIncomes.add({
        id: undefined as unknown as number,
        amount,
        memo,
        isActive: true,
        createdAt: new Date(),
      });
      setAmountInput('');
      setMemoInput('');
      setToast('고정 수입이 추가되었습니다.');
    } catch {
      setToast('추가에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 활성 여부 토글
  const handleToggle = async (income: FixedIncome) => {
    await db.fixedIncomes.update(income.id, { isActive: !income.isActive });
  };

  // 삭제
  const handleDelete = async (id: number) => {
    await db.fixedIncomes.delete(id);
    setToast('삭제되었습니다.');
  };

  return (
    <div className="min-h-screen pb-20 md:pb-6">
      {/* 토스트 */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* 상단 헤더 */}
      <div className="glass-header px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 touch-target -ml-1"
          aria-label="뒤로가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <h1 className="fluid-heading text-gray-900">고정 수입 관리</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* 총 고정 수입 요약 */}
        <section className="bg-[#3182F6] rounded-2xl px-5 py-4 text-white">
          <p className="text-sm opacity-80 mb-1">월 고정 수입</p>
          <p className="text-2xl font-bold">₩{activeTotal.toLocaleString('ko-KR')}</p>
        </section>

        {/* 새 수입 추가 폼 */}
        <section className="glass-card px-5 py-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">새 고정 수입 추가</h2>

          {/* 메모 입력 */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">항목명</label>
            <input
              type="text"
              placeholder="예: 급여, 부수입"
              value={memoInput}
              onChange={(e) => setMemoInput(e.target.value)}
              className="w-full text-sm text-gray-900 border border-gray-200 rounded-xl px-4 py-2.5 outline-none focus:border-[#3182F6] transition-colors"
            />
          </div>

          {/* 금액 입력 */}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">금액</label>
            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-[#3182F6] transition-colors">
              <span className="text-sm text-gray-400 mr-1">₩</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amountInput}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="flex-1 text-sm font-medium text-gray-900 bg-transparent outline-none"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={saving}
            className="w-full py-3 rounded-xl bg-[#3182F6] text-white text-sm font-semibold hover:bg-[#1B64DA] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '추가 중...' : '추가하기'}
          </button>
        </section>

        {/* 고정 수입 목록 */}
        <section className="glass-card overflow-hidden divide-y divide-white/10">
          {!fixedIncomes ? (
            <div className="py-10 text-center text-sm text-gray-400">불러오는 중...</div>
          ) : fixedIncomes.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">등록된 고정 수입이 없습니다.</div>
          ) : (
            fixedIncomes.map((income) => (
              <div key={income.id} className="flex items-center gap-3 px-5 py-4">
                {/* 수입 정보 */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${income.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                    {income.memo}
                  </p>
                  <p className={`text-xs mt-0.5 ${income.isActive ? 'text-[#3182F6]' : 'text-gray-300'}`}>
                    ₩{income.amount.toLocaleString('ko-KR')}
                  </p>
                </div>

                {/* 활성 토글 */}
                <button
                  type="button"
                  onClick={() => handleToggle(income)}
                  className={`w-12 h-7 rounded-full transition-colors flex-shrink-0 relative ${
                    income.isActive ? 'bg-[#3182F6]' : 'bg-gray-200'
                  }`}
                  aria-label={income.isActive ? '비활성화' : '활성화'}
                >
                  <span
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${
                      income.isActive ? 'left-[calc(100%-1.5rem)]' : 'left-1'
                    }`}
                  />
                </button>

                {/* 삭제 버튼 */}
                <button
                  type="button"
                  onClick={() => handleDelete(income.id)}
                  className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
                  aria-label="삭제"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
