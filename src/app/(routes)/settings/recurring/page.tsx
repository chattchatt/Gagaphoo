'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type RecurringExpense, type Category } from '@/lib/db';
import { initializeDB } from '@/lib/seed';
import { addRecurring, updateRecurring, deleteRecurring } from '@/lib/recurring';
import { parseCurrencyInput } from '@/lib/format';

// 요일 레이블
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

// 주기 레이블
const CYCLE_LABELS: Record<RecurringExpense['cycle'], string> = {
  monthly: '매월',
  weekly: '매주',
};

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

// 반복 지출 폼 초기값
interface RecurringForm {
  amount: string;
  memo: string;
  categoryId: number | '';
  cycle: RecurringExpense['cycle'];
  dayOfMonth: number;
  dayOfWeek: number;
  isActive: boolean;
}

const DEFAULT_FORM: RecurringForm = {
  amount: '',
  memo: '',
  categoryId: '',
  cycle: 'monthly',
  dayOfMonth: 1,
  dayOfWeek: 1,
  isActive: true,
};

// 수입 전용 카테고리명 (목록에서 제외)
const INCOME_CATEGORY_NAMES = ['기타수입', '급여'];

// 모달 컴포넌트
function RecurringModal({
  editing,
  categories,
  onClose,
  onSaved,
}: {
  editing: RecurringExpense | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [form, setForm] = useState<RecurringForm>(() => {
    if (editing) {
      return {
        amount: editing.amount.toLocaleString('ko-KR'),
        memo: editing.memo,
        categoryId: editing.categoryId,
        cycle: editing.cycle,
        dayOfMonth: editing.dayOfMonth ?? 1,
        dayOfWeek: editing.dayOfWeek ?? 1,
        isActive: editing.isActive,
      };
    }
    return DEFAULT_FORM;
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof RecurringForm, string>>>({});

  const validate = (): boolean => {
    const next: Partial<Record<keyof RecurringForm, string>> = {};
    const amount = parseCurrencyInput(form.amount);
    if (!form.amount || amount <= 0) next.amount = '금액을 입력해주세요.';
    if (!form.memo.trim()) next.memo = '메모를 입력해주세요.';
    if (form.categoryId === '') next.categoryId = '카테고리를 선택해주세요.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (saving) return;
    setSaving(true);

    try {
      const data: Omit<RecurringExpense, 'id' | 'createdAt'> = {
        amount: parseCurrencyInput(form.amount),
        memo: form.memo.trim(),
        categoryId: form.categoryId as number,
        cycle: form.cycle,
        dayOfMonth: form.cycle === 'monthly' ? form.dayOfMonth : null,
        dayOfWeek: form.cycle === 'weekly' ? form.dayOfWeek : null,
        isActive: form.isActive,
      };

      if (editing) {
        await updateRecurring(editing.id, data);
        onSaved('반복 지출을 수정했습니다.');
      } else {
        await addRecurring(data);
        onSaved('반복 지출을 추가했습니다.');
      }
      onClose();
    } catch {
      onSaved('저장에 실패했습니다. 다시 시도해주세요.');
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg glass-card-heavy rounded-t-3xl rounded-b-none px-5 pt-5 pb-8 space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">
            {editing ? '반복 지출 수정' : '반복 지출 추가'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-700"
            aria-label="닫기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 메모 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">메모</label>
          <input
            type="text"
            placeholder="예: 넷플릭스 구독"
            value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white outline-none focus:border-[#3182F6] transition-colors"
          />
          {errors.memo && <p className="mt-1 text-xs text-red-500">{errors.memo}</p>}
        </div>

        {/* 금액 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">금액</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-[#3182F6] transition-colors">
            <span className="text-sm text-gray-400 mr-1">₩</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={form.amount}
              onChange={(e) => {
                const onlyNums = e.target.value.replace(/[^0-9]/g, '');
                const formatted = onlyNums ? Number(onlyNums).toLocaleString('ko-KR') : '';
                setForm((f) => ({ ...f, amount: formatted }));
              }}
              className="flex-1 text-right text-sm font-medium text-gray-900 bg-transparent outline-none"
            />
          </div>
          {errors.amount && <p className="mt-1 text-xs text-red-500">{errors.amount}</p>}
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">카테고리</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: Number(e.target.value) }))}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#3182F6] transition-colors bg-white"
          >
            <option value="">선택</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          {errors.categoryId && <p className="mt-1 text-xs text-red-500">{errors.categoryId}</p>}
        </div>

        {/* 주기 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">주기</label>
          <div className="flex gap-2">
            {(['monthly', 'weekly'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setForm((f) => ({ ...f, cycle: c }))}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  form.cycle === c
                    ? 'bg-[#3182F6] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CYCLE_LABELS[c]}
              </button>
            ))}
          </div>
        </div>

        {/* 매월: 일자 선택 */}
        {form.cycle === 'monthly' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">매월 몇 일</label>
            <select
              value={form.dayOfMonth}
              onChange={(e) => setForm((f) => ({ ...f, dayOfMonth: Number(e.target.value) }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#3182F6] transition-colors bg-white"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>{d}일</option>
              ))}
            </select>
          </div>
        )}

        {/* 매주: 요일 선택 */}
        {form.cycle === 'weekly' && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">매주 요일</label>
            <div className="flex gap-1.5">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, dayOfWeek: idx }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    form.dayOfWeek === idx
                      ? 'bg-[#3182F6] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 활성화 토글 (수정 모드에서만 표시) */}
        {editing && (
          <div className="flex items-center justify-between py-1">
            <span className="text-sm font-medium text-gray-700">활성화</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.isActive ? 'bg-[#3182F6]' : 'bg-gray-300'
              }`}
              aria-checked={form.isActive}
              role="switch"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        )}

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition-all ${
            !saving
              ? 'bg-[#3182F6] text-white hover:bg-[#1B64DA] active:scale-[0.98]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          {saving ? '저장 중...' : editing ? '수정하기' : '추가하기'}
        </button>
      </div>
    </div>
  );
}

export default function RecurringSettingsPage() {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  useEffect(() => {
    initializeDB();
  }, []);

  // 전체 반복 지출 목록 (실시간)
  const items = useLiveQuery<RecurringExpense[]>(
    () => db.recurringExpenses.toArray().then(arr => arr.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())),
    []
  );

  // 카테고리 목록 (지출용)
  const categories = useLiveQuery<Category[]>(
    () => db.categories.toArray().then((all) => all.filter((c) => !INCOME_CATEGORY_NAMES.includes(c.name))),
    []
  );

  const categoryMap = new Map(categories?.map((c) => [c.id, c]) ?? []);

  // 활성 토글
  const handleToggleActive = async (item: RecurringExpense) => {
    await updateRecurring(item.id, { isActive: !item.isActive });
  };

  // 삭제 확인
  const handleDelete = async (id: number) => {
    await deleteRecurring(id);
    setDeleteConfirm(null);
    setToast('삭제했습니다.');
  };

  // 주기 요약 텍스트
  const getCycleSummary = (item: RecurringExpense): string => {
    if (item.cycle === 'monthly' && item.dayOfMonth != null) {
      return `매월 ${item.dayOfMonth}일`;
    }
    if (item.cycle === 'weekly' && item.dayOfWeek != null) {
      return `매주 ${DAY_LABELS[item.dayOfWeek]}요일`;
    }
    return '';
  };

  return (
    <div className="min-h-screen pb-20 md:pb-6">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* 모달 */}
      {modalOpen && categories && (
        <RecurringModal
          editing={editing}
          categories={categories}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSaved={(msg) => setToast(msg)}
        />
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="glass-card-heavy px-6 py-5 mx-4 max-w-sm w-full shadow-xl space-y-4">
            <p className="text-sm font-medium text-gray-900 text-center">이 반복 지출을 삭제할까요?</p>
            <p className="text-xs text-gray-400 text-center">삭제해도 이미 기록된 거래 내역은 유지됩니다.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-200"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 rounded-xl bg-red-500 text-sm font-medium text-white hover:bg-red-600"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

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
        <h1 className="fluid-heading text-gray-900 flex-1">반복 지출</h1>
        {/* 추가 버튼 */}
        <button
          type="button"
          onClick={() => { setEditing(null); setModalOpen(true); }}
          className="flex items-center gap-1.5 bg-[#3182F6] text-white text-sm font-medium px-3 py-1.5 rounded-full hover:bg-[#1B64DA] transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          추가
        </button>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {!items ? (
          <div className="py-10 text-center text-sm text-gray-400">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-3xl">🔄</p>
            <p className="text-sm text-gray-400">등록된 반복 지출이 없습니다.</p>
            <button
              type="button"
              onClick={() => { setEditing(null); setModalOpen(true); }}
              className="mt-2 text-sm font-medium text-[#3182F6] hover:underline"
            >
              첫 번째 반복 지출 추가하기
            </button>
          </div>
        ) : (
          <section className="glass-card overflow-hidden divide-y divide-white/10">
            {items.map((item) => {
              const cat = categoryMap.get(item.categoryId);
              return (
                <div key={item.id} className="px-5 py-4 flex items-center gap-3">
                  {/* 카테고리 아이콘 */}
                  <span
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: cat ? cat.color + '22' : '#f3f4f6' }}
                  >
                    {cat?.icon ?? '📌'}
                  </span>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.memo}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {getCycleSummary(item)} · {item.amount.toLocaleString('ko-KR')}원
                    </p>
                  </div>

                  {/* 활성 토글 */}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(item)}
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                      item.isActive ? 'bg-[#3182F6]' : 'bg-gray-300'
                    }`}
                    aria-checked={item.isActive}
                    role="switch"
                    aria-label={item.isActive ? '비활성화' : '활성화'}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        item.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  {/* 수정 버튼 */}
                  <button
                    type="button"
                    onClick={() => { setEditing(item); setModalOpen(true); }}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-gray-700 flex-shrink-0"
                    aria-label="수정"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>

                  {/* 삭제 버튼 */}
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(item.id)}
                    className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-red-500 flex-shrink-0"
                    aria-label="삭제"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
