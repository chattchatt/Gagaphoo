'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { parseCurrencyInput, formatCurrency } from '@/lib/format';
import { initializeDB } from '@/lib/seed';
import { db, type Category } from '@/lib/db';
import { getCachedClassification, cacheClassification, updateCacheOnUserCorrection } from '@/lib/ai-cache';
import { useBudgetAlert } from '@/hooks/useBudgetAlert';

// 수입 전용 카테고리 이름 목록
const INCOME_CATEGORY_NAMES = ['기타수입', '급여'];

// 토스트 메시지 컴포넌트
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

export default function InputPage() {
  const router = useRouter();

  // 거래 타입: 지출/수입
  const [type, setType] = useState<'expense' | 'income'>('expense');

  // 금액 입력
  const [rawAmount, setRawAmount] = useState('');

  // 메모
  const [memo, setMemo] = useState('');

  // 카테고리 목록 (DB에서 로드)
  const [categories, setCategories] = useState<Category[]>([]);

  // 선택된 카테고리 ID
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

  // AI 추천 카테고리 ID
  const [aiCategoryId, setAiCategoryId] = useState<number | null>(null);

  // AI 분류 로딩 상태
  const [aiLoading, setAiLoading] = useState(false);

  // 사용자가 AI 추천을 수동으로 변경했는지 여부
  const [userModified, setUserModified] = useState(false);

  // 저장 중 상태
  const [saving, setSaving] = useState(false);

  // 날짜 선택 (기본값: 오늘)
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // 토스트 메시지
  const [toast, setToast] = useState<string | null>(null);

  // 금액 입력 필드 ref (자동 포커스용)
  const amountInputRef = useRef<HTMLInputElement>(null);

  // debounce 타이머 ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 마지막으로 분류 요청한 메모 (중복 호출 방지)
  const lastClassifiedMemo = useRef<string>('');

  // DB 초기화 및 카테고리 로드
  useEffect(() => {
    async function loadCategories() {
      await initializeDB();
      const all = await db.categories.toArray();
      setCategories(all);
    }
    loadCategories();
  }, []);

  // 예산 알림 훅
  const { checkAndNotify } = useBudgetAlert();

  // 금액 자동 포커스
  useEffect(() => {
    amountInputRef.current?.focus();
  }, []);

  // 표시용 금액 (쉼표 포함)
  const displayAmount = rawAmount ? Number(rawAmount).toLocaleString('ko-KR') : '';
  const parsedAmount = parseCurrencyInput(rawAmount);

  // 수입/지출에 따라 필터링된 카테고리
  const filteredCategories =
    type === 'income'
      ? categories.filter((c) => INCOME_CATEGORY_NAMES.includes(c.name))
      : categories.filter((c) => !INCOME_CATEGORY_NAMES.includes(c.name));

  // 타입 변경 시 카테고리 선택 초기화
  useEffect(() => {
    setSelectedCategoryId(null);
    setAiCategoryId(null);
    setUserModified(false);
  }, [type]);

  // AI 분류 호출 (클라이언트 캐시 우선 → 미스 시 API 호출)
  const classifyMemo = useCallback(
    async (memoText: string) => {
      if (!memoText.trim() || memoText === lastClassifiedMemo.current) return;
      if (type === 'income') return; // 수입은 AI 분류 불필요

      lastClassifiedMemo.current = memoText;
      setAiLoading(true);

      try {
        // 1. 클라이언트 캐시(IndexedDB) 먼저 확인
        const cachedCategoryId = await getCachedClassification(memoText.trim());
        if (cachedCategoryId !== null) {
          setAiCategoryId(cachedCategoryId);
          if (!userModified) {
            setSelectedCategoryId(cachedCategoryId);
          }
          return;
        }

        // 2. 캐시 미스 → API 호출
        const res = await fetch('/api/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memo: memoText, amount: parsedAmount }),
        });

        if (!res.ok) return;

        const data = (await res.json()) as { categoryName: string; confidence: number; cached: boolean };

        // 분류된 카테고리를 ID로 변환
        const matched = categories.find((c) => c.name === data.categoryName);
        if (matched) {
          setAiCategoryId(matched.id);
          if (!userModified) {
            setSelectedCategoryId(matched.id);
          }
          // 3. 결과를 클라이언트 캐시에 저장
          await cacheClassification(memoText.trim(), matched.id);
        }
      } catch {
        // AI 분류 실패는 무시
      } finally {
        setAiLoading(false);
      }
    },
    [categories, parsedAmount, type, userModified]
  );

  // 메모 변경 핸들러 (500ms debounce)
  const handleMemoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMemo(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      classifyMemo(value);
    }, 500);
  };

  // 메모 blur 시에도 분류 실행
  const handleMemoBlur = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    classifyMemo(memo);
  };

  // 카테고리 선택 핸들러
  const handleCategorySelect = async (categoryId: number) => {
    const wasAiSelected = aiCategoryId !== null && selectedCategoryId === aiCategoryId;
    setSelectedCategoryId(categoryId);

    // AI 추천과 다른 카테고리를 선택하면 수동 수정으로 기록
    if (aiCategoryId !== null && categoryId !== aiCategoryId) {
      setUserModified(true);
      // AI 캐시 업데이트
      if (memo.trim()) {
        await updateCacheOnUserCorrection(memo.trim(), categoryId);
      }
    } else if (categoryId === aiCategoryId) {
      // AI 추천 카테고리를 다시 선택하면 수동 수정 해제
      setUserModified(false);
    }

    // 타입스크립트 unused var 방지
    void wasAiSelected;
  };

  // 금액 입력 핸들러 (최대 12자리 제한)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyNumbers = e.target.value.replace(/[^0-9]/g, '');
    if (onlyNumbers.length > 12) return;
    setRawAmount(onlyNumbers);
  };

  // 저장 유효성
  const isValid = parsedAmount > 0 && selectedCategoryId !== null;

  // 저장 핸들러
  const handleSave = async () => {
    if (!isValid || saving) return;

    setSaving(true);
    try {
      await db.transactions.add({
        id: undefined as unknown as number,
        amount: parsedAmount,
        memo: memo.trim(),
        categoryId: selectedCategoryId!,
        type,
        date: selectedDate,
        aiClassified: aiCategoryId !== null && !userModified,
        userModified,
        createdAt: new Date(),
      });

      setToast('저장 완료');

      // 거래 저장 후 예산 임계값 알림 확인
      await checkAndNotify();

      // 토스트 표시 후 홈으로 이동
      setTimeout(() => {
        setSaving(false);
        router.push('/');
      }, 1500);
    } catch {
      setToast('저장 실패. 다시 시도해주세요.');
      setSaving(false);
    }
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
          className="text-gray-500 hover:text-gray-700 p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          aria-label="뒤로가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <h1 className="fluid-heading font-bold text-gray-900">내역 입력</h1>
      </div>

      <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
        {/* 수입/지출 세그먼트 컨트롤 */}
        <div className="bg-gray-100 rounded-2xl p-1 flex">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              type === 'expense'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500'
            }`}
          >
            지출
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              type === 'income'
                ? 'bg-white text-[#3182F6] shadow-sm'
                : 'text-gray-500'
            }`}
          >
            수입
          </button>
        </div>

        {/* 금액 입력 */}
        <section className="glass-card-heavy p-5">
          <label className="block text-sm text-gray-500 mb-2">금액</label>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-gray-400">₩</span>
            <input
              ref={amountInputRef}
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={displayAmount}
              onChange={handleAmountChange}
              className="flex-1 fluid-amount font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-200 min-w-0"
            />
          </div>
          {parsedAmount > 0 && (
            <p className="mt-1 text-sm text-gray-400">{formatCurrency(parsedAmount)}</p>
          )}
        </section>

        {/* 메모 입력 */}
        <section className="glass-card-heavy p-5">
          <label className="block text-sm text-gray-500 mb-2">메모</label>
          <input
            type="text"
            placeholder="어디에 사용했나요?"
            value={memo}
            onChange={handleMemoChange}
            onBlur={handleMemoBlur}
            maxLength={50}
            className="w-full text-base text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
          />
        </section>

        {/* 날짜 선택 */}
        <section className="glass-card-heavy p-5">
          <label className="block text-sm text-gray-500 mb-2">날짜</label>
          <input
            type="date"
            value={selectedDate}
            max={todayStr}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full text-base text-gray-900 bg-transparent outline-none"
          />
        </section>

        {/* 카테고리 선택 */}
        <section className="glass-card-heavy p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm text-gray-500">카테고리</label>
            {aiLoading && (
              <span className="flex items-center gap-1.5 text-xs text-[#3182F6]">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                AI 분류 중
              </span>
            )}
          </div>

          {/* 4열 그리드, 최대 높이 스크롤 */}
          <div className="grid grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {filteredCategories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              const isAiRecommended = aiCategoryId === cat.id;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`relative flex flex-col items-center gap-1 py-3.5 min-h-[44px] rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-[#3182F6] bg-[#EBF5FF]'
                      : 'border-transparent bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  {/* AI 뱃지 */}
                  {isAiRecommended && (
                    <span className="absolute top-1 right-1 bg-[#3182F6] text-white text-[9px] font-bold px-1 py-0.5 rounded leading-none">
                      AI
                    </span>
                  )}
                  <span className="text-xl">{cat.icon}</span>
                  <span
                    className={`text-[10px] font-medium text-center leading-tight ${
                      isSelected ? 'text-[#3182F6]' : 'text-gray-600'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!isValid || saving}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition-all ${
            isValid && !saving
              ? 'bg-[#3182F6] text-white hover:bg-[#1B64DA] active:scale-[0.98]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          {saving ? '저장 중...' : '저장하기'}
        </button>
      </div>
    </div>
  );
}
