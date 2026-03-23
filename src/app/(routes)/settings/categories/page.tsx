'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Category } from '@/lib/db';
import { initializeDB } from '@/lib/seed';

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

// 선택 가능한 아이콘 목록
const ICON_OPTIONS = [
  '🍚', '☕', '🚌', '🛍️', '🏠', '🏥', '🎬', '📚', '🎁', '🔄',
  '🏢', '💰', '💳', '📌', '🍕', '🍺', '✈️', '🎮', '💊', '🐱',
  '👶', '💇', '🏋️', '🎵', '📱', '🚗', '⛽', '🧹', '👕', '🎂',
];

// 선택 가능한 색상 목록
const COLOR_OPTIONS = [
  '#FF6B6B', '#C8956C', '#4ECDC4', '#A78BFA', '#60A5FA',
  '#F87171', '#34D399', '#FBBF24', '#F472B6', '#818CF8',
  '#6EE7B7', '#86EFAC', '#4ADE80', '#94A3B8', '#FB923C',
  '#E879F9', '#22D3EE', '#A3E635', '#F43F5E', '#8B5CF6',
];

interface CategoryForm {
  name: string;
  icon: string;
  color: string;
}

const DEFAULT_FORM: CategoryForm = { name: '', icon: '📌', color: '#94A3B8' };

// 모달 컴포넌트
function CategoryModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: Category | null;
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [form, setForm] = useState<CategoryForm>(() =>
    editing
      ? { name: editing.name, icon: editing.icon, color: editing.color }
      : DEFAULT_FORM
  );

  const isValid = form.name.trim().length > 0;

  const handleSave = async () => {
    if (!isValid) return;

    if (editing) {
      await db.categories.update(editing.id, {
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
      });
      onSaved('카테고리가 수정됐습니다.');
    } else {
      await db.categories.add({
        id: undefined as unknown as number,
        name: form.name.trim(),
        icon: form.icon,
        color: form.color,
        isDefault: false,
      });
      onSaved('카테고리가 추가됐습니다.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="glass-card-heavy w-full max-w-lg rounded-t-2xl md:rounded-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">
          {editing ? '카테고리 수정' : '카테고리 추가'}
        </h2>

        {/* 이름 입력 */}
        <div>
          <label className="block text-sm text-gray-500 mb-1">이름</label>
          <input
            type="text"
            placeholder="카테고리 이름"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={10}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#3182F6]"
          />
        </div>

        {/* 아이콘 선택 */}
        <div>
          <label className="block text-sm text-gray-500 mb-1">아이콘</label>
          <div className="grid grid-cols-10 gap-1">
            {ICON_OPTIONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm({ ...form, icon })}
                className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                  form.icon === icon
                    ? 'bg-[#EBF5FF] ring-2 ring-[#3182F6]'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* 색상 선택 */}
        <div>
          <label className="block text-sm text-gray-500 mb-1">색상</label>
          <div className="grid grid-cols-10 gap-1">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setForm({ ...form, color })}
                className={`w-9 h-9 rounded-lg transition-all ${
                  form.color === color ? 'ring-2 ring-[#3182F6] scale-110' : ''
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* 미리보기 */}
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
          <span
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ backgroundColor: form.color + '20' }}
          >
            {form.icon}
          </span>
          <span className="text-sm font-medium text-gray-900">
            {form.name || '카테고리 이름'}
          </span>
        </div>

        {/* 버튼 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
              isValid
                ? 'bg-[#3182F6] text-white hover:bg-[#1B64DA]'
                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
            }`}
          >
            {editing ? '수정' : '추가'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null);

  useEffect(() => {
    initializeDB();
  }, []);

  const categories = useLiveQuery<Category[], Category[]>(
    () => db.categories.toArray(),
    [],
    [],
  );

  const handleEdit = (cat: Category) => {
    setEditing(cat);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const handleDelete = async (cat: Category) => {
    // 해당 카테고리를 사용하는 거래가 있는지 확인
    const usageCount = await db.transactions
      .where('categoryId')
      .equals(cat.id)
      .count();

    if (usageCount > 0) {
      setToast(`${usageCount}건의 거래에서 사용 중이라 삭제할 수 없습니다.`);
      setConfirmDelete(null);
      return;
    }

    await db.categories.delete(cat.id);
    setConfirmDelete(null);
    setToast('카테고리가 삭제됐습니다.');
  };

  return (
    <div className="min-h-screen pb-20 md:pb-6">
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
        <h1 className="fluid-heading text-gray-900">카테고리 관리</h1>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-lg mx-auto">
        {/* 카테고리 목록 */}
        <div className="glass-card overflow-hidden divide-y divide-gray-50">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-5 py-3">
              <span
                className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: cat.color + '20' }}
              >
                {cat.icon}
              </span>
              <span className="flex-1 text-sm font-medium text-gray-900">{cat.name}</span>

              {/* 편집 버튼 */}
              <button
                type="button"
                onClick={() => handleEdit(cat)}
                className="p-2 text-gray-400 hover:text-[#3182F6] transition-colors"
                aria-label="편집"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5Z" />
                </svg>
              </button>

              {/* 삭제 버튼 */}
              <button
                type="button"
                onClick={() => setConfirmDelete(cat)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                aria-label="삭제"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* 추가 버튼 */}
        <button
          type="button"
          onClick={handleAdd}
          className="w-full py-4 rounded-2xl text-sm font-semibold bg-[#3182F6] text-white hover:bg-[#1B64DA] active:scale-[0.98] transition-all"
        >
          + 카테고리 추가
        </button>
      </div>

      {/* 추가/수정 모달 */}
      {modalOpen && (
        <CategoryModal
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={(msg) => {
            setModalOpen(false);
            setToast(msg);
          }}
        />
      )}

      {/* 삭제 확인 모달 */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setConfirmDelete(null)}>
          <div className="glass-card-heavy p-5 mx-4 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm text-gray-900 text-center">
              <span className="text-xl">{confirmDelete.icon}</span>{' '}
              <span className="font-semibold">{confirmDelete.name}</span> 카테고리를 삭제할까요?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-gray-100 text-gray-600"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
