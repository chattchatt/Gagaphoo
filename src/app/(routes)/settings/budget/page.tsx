'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Category } from '@/lib/db';
import Link from 'next/link';
import { initializeDB } from '@/lib/seed';
import { parseCurrencyInput } from '@/lib/format';
import { upsertBudget, getFixedIncomeTotal } from '@/lib/budget';

// 수입 전용 카테고리 이름 (예산 설정 제외)
const INCOME_CATEGORY_NAMES = ['기타수입', '급여'];

// 현재 월 YYYY-MM 반환
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// 이전 월 YYYY-MM 반환
function getPrevMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1); // m-2: 0-indexed 이전 달
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

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

export default function BudgetSettingsPage() {
  const router = useRouter();

  // 선택된 월
  const [month, setMonth] = useState(getCurrentMonth());

  // 카테고리별 입력값 (categoryId → 표시 문자열)
  const [inputs, setInputs] = useState<Record<number, string>>({});

  // 유효성 에러 (categoryId → 에러 메시지)
  const [errors, setErrors] = useState<Record<number, string>>({});

  // 저장 중 상태
  const [saving, setSaving] = useState(false);

  // 토스트 메시지
  const [toast, setToast] = useState<string | null>(null);

  // DB 초기화
  useEffect(() => {
    initializeDB();
  }, []);

  // 지출 카테고리 목록 (실시간)
  const categories = useLiveQuery<Category[]>(
    () => db.categories.toArray().then((all) => all.filter((c) => !INCOME_CATEGORY_NAMES.includes(c.name))),
    []
  );

  // 해당 월 예산 (실시간)
  const budgets = useLiveQuery(
    () => db.budgets.where('month').equals(month).toArray(),
    [month]
  );

  // 활성 고정 수입 합계 (실시간)
  const fixedIncomeTotal = useLiveQuery(
    () => getFixedIncomeTotal(),
    []
  ) ?? 0;

  // 예산 로드 → inputs 동기화
  useEffect(() => {
    if (!budgets) return;
    const next: Record<number, string> = {};
    for (const b of budgets) {
      next[b.categoryId] = b.amount.toLocaleString('ko-KR');
    }
    setInputs(next);
    setErrors({});
  }, [budgets]);

  // 금액 입력 핸들러
  const handleAmountChange = (categoryId: number, value: string) => {
    // 숫자와 쉼표만 허용
    const onlyNumbers = value.replace(/[^0-9]/g, '');
    const formatted = onlyNumbers ? Number(onlyNumbers).toLocaleString('ko-KR') : '';
    setInputs((prev) => ({ ...prev, [categoryId]: formatted }));

    // 실시간 유효성 검사
    const parsed = parseCurrencyInput(formatted);
    if (parsed < 0) {
      setErrors((prev) => ({ ...prev, [categoryId]: '음수는 입력할 수 없습니다.' }));
    } else {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[categoryId];
        return next;
      });
    }
  };

  // 이전 달 예산 불러오기
  const handleLoadPrevMonth = useCallback(async () => {
    const prevMonth = getPrevMonth(month);
    const prevBudgets = await db.budgets.where('month').equals(prevMonth).toArray();
    if (prevBudgets.length === 0) {
      setToast('이전 달 예산 데이터가 없습니다.');
      return;
    }
    const next: Record<number, string> = {};
    for (const b of prevBudgets) {
      next[b.categoryId] = b.amount.toLocaleString('ko-KR');
    }
    setInputs(next);
    setErrors({});
    setToast('이전 달 예산을 불러왔습니다.');
  }, [month]);

  // 저장 핸들러
  const handleSave = async () => {
    if (saving) return;

    // 에러 있으면 저장 차단
    if (Object.keys(errors).length > 0) {
      setToast('입력값을 확인해주세요.');
      return;
    }

    setSaving(true);
    try {
      const ops: Promise<void>[] = [];

      for (const [catIdStr, displayVal] of Object.entries(inputs)) {
        const categoryId = Number(catIdStr);
        const amount = parseCurrencyInput(displayVal);
        ops.push(upsertBudget(categoryId, month, amount));
      }

      // 입력이 비어있는 카테고리는 예산 0(삭제)으로 처리
      if (categories) {
        for (const cat of categories) {
          if (!(cat.id in inputs) || inputs[cat.id] === '') {
            ops.push(upsertBudget(cat.id, month, 0));
          }
        }
      }

      await Promise.all(ops);
      setToast('예산이 저장되었습니다.');
    } catch {
      setToast('저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-6">
      {/* 토스트 */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* 상단 헤더 */}
      <div className="bg-white px-5 pt-6 pb-4 border-b border-gray-100 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 p-1 -ml-1"
          aria-label="뒤로가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">예산 설정</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* 월 선택기 */}
        <section className="bg-white rounded-2xl px-5 py-4 shadow-sm flex items-center justify-between">
          <button
            type="button"
            onClick={() => setMonth(getPrevMonth(month))}
            className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="이전 달"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="text-base font-semibold text-gray-900">
            {month.replace('-', '년 ')}월
          </span>
          <button
            type="button"
            onClick={() => {
              const [y, m] = month.split('-').map(Number);
              const d = new Date(y, m, 1);
              const next = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              setMonth(next);
            }}
            className="p-2 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="다음 달"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </section>

        {/* 이전 달 예산 불러오기 버튼 */}
        <button
          type="button"
          onClick={handleLoadPrevMonth}
          className="w-full py-3 rounded-2xl border border-gray-200 bg-white text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          이전 달 예산 불러오기
        </button>

        {/* 고정 수입 배너 */}
        {fixedIncomeTotal > 0 ? (
          (() => {
            // 현재 입력값 기준 총 예산 계산
            const totalBudgetInput = Object.values(inputs).reduce((sum, v) => {
              const n = Number(v.replace(/,/g, ''));
              return sum + (isNaN(n) ? 0 : n);
            }, 0);
            const isOver = totalBudgetInput > fixedIncomeTotal;
            return (
              <div className={`rounded-2xl px-5 py-3 flex items-center justify-between ${isOver ? 'bg-red-50 border border-red-100' : 'bg-blue-50 border border-blue-100'}`}>
                <div>
                  <p className={`text-xs font-medium ${isOver ? 'text-red-500' : 'text-[#3182F6]'}`}>
                    고정 수입: ₩{fixedIncomeTotal.toLocaleString('ko-KR')}
                  </p>
                  {isOver && (
                    <p className="text-xs text-red-400 mt-0.5">
                      예산 합계가 수입을 초과했습니다
                    </p>
                  )}
                </div>
                <Link href="/settings/income" className="text-xs text-gray-400 hover:text-gray-600 underline">
                  수입 관리
                </Link>
              </div>
            );
          })()
        ) : (
          <div className="rounded-2xl px-5 py-3 bg-gray-50 border border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">고정 수입을 설정하면 예산 비율을 확인할 수 있습니다.</p>
            <Link href="/settings/income" className="text-xs text-[#3182F6] hover:underline flex-shrink-0 ml-2">
              설정하기
            </Link>
          </div>
        )}

        {/* 카테고리별 예산 입력 */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-50">
          {!categories ? (
            <div className="py-10 text-center text-sm text-gray-400">불러오는 중...</div>
          ) : (
            categories.map((cat) => {
              const error = errors[cat.id];
              return (
                <div key={cat.id} className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    {/* 아이콘 */}
                    <span
                      className="w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: cat.color + '22' }}
                    >
                      {cat.icon}
                    </span>

                    {/* 카테고리명 */}
                    <span className="flex-1 text-sm font-medium text-gray-900">{cat.name}</span>

                    {/* 금액 입력 */}
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-gray-400">₩</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="미설정"
                        value={inputs[cat.id] ?? ''}
                        onChange={(e) => handleAmountChange(cat.id, e.target.value)}
                        className="w-28 text-right text-sm font-medium text-gray-900 bg-transparent outline-none placeholder:text-gray-300 border-b border-gray-200 focus:border-[#3182F6] pb-0.5 transition-colors"
                      />
                    </div>
                  </div>

                  {/* 수입 대비 비율 힌트 */}
                  {fixedIncomeTotal > 0 && inputs[cat.id] && !error && (() => {
                    const amt = Number((inputs[cat.id] ?? '').replace(/,/g, ''));
                    if (!amt) return null;
                    const pct = Math.round((amt / fixedIncomeTotal) * 100);
                    return (
                      <p className="mt-1 text-xs text-gray-400 text-right">수입의 {pct}%</p>
                    );
                  })()}

                  {/* 에러 메시지 */}
                  {error && (
                    <p className="mt-1.5 text-xs text-red-500 text-right">{error}</p>
                  )}
                </div>
              );
            })
          )}
        </section>

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || Object.keys(errors).length > 0}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition-all ${
            !saving && Object.keys(errors).length === 0
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
