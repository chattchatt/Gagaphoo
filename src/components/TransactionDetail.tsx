'use client';

import { useState } from 'react';
import { db, type Transaction, type Category } from '@/lib/db';
import { formatCurrency, formatDate } from '@/lib/format';

interface TransactionDetailProps {
  transaction: Transaction | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  onUpdated?: () => void;
}

export default function TransactionDetail({
  transaction,
  categories,
  isOpen,
  onClose,
  onDeleted,
  onUpdated,
}: TransactionDetailProps) {
  // 편집 상태값
  const [editAmount, setEditAmount] = useState('');
  const [editMemo, setEditMemo] = useState('');
  const [editCategoryId, setEditCategoryId] = useState<number>(0);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 바텀시트가 열릴 때 편집값 초기화
  if (!isOpen || !transaction) {
    return null;
  }

  const category = categories.find((c) => c.id === transaction.categoryId);

  // 편집 모드 진입
  function handleStartEdit() {
    setEditAmount(String(transaction!.amount));
    setEditMemo(transaction!.memo);
    setEditCategoryId(transaction!.categoryId);
    setIsEditing(true);
  }

  // 편집 취소
  function handleCancelEdit() {
    setIsEditing(false);
    setShowDeleteConfirm(false);
  }

  // 수정 저장 — IndexedDB 업데이트
  async function handleSave() {
    if (!transaction) return;
    const amount = parseInt(editAmount.replace(/[^0-9]/g, ''), 10);
    if (!amount || amount <= 0) return;

    setIsSaving(true);
    try {
      await db.transactions.update(transaction.id, {
        amount,
        memo: editMemo.trim(),
        categoryId: editCategoryId,
        userModified: true,
      });
      setIsEditing(false);
      onUpdated?.();
    } finally {
      setIsSaving(false);
    }
  }

  // 삭제 확인 후 IndexedDB에서 제거
  async function handleDelete() {
    if (!transaction) return;
    await db.transactions.delete(transaction.id);
    setShowDeleteConfirm(false);
    onDeleted?.();
    onClose();
  }

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 바텀시트 — 하단에서 슬라이드업 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-xl max-w-2xl mx-auto animate-slide-up">
        {/* 핸들 바 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            {isEditing ? '내역 수정' : '거래 상세'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full"
            aria-label="닫기"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5"
            >
              <path
                fillRule="evenodd"
                d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="px-5 py-4 space-y-4">
          {isEditing ? (
            /* 편집 폼 */
            <>
              {/* 금액 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">금액</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#3182F6]"
                  placeholder="금액 입력"
                  min={1}
                />
              </div>

              {/* 메모 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">메모</label>
                <input
                  type="text"
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:border-[#3182F6]"
                  placeholder="메모 입력"
                  maxLength={100}
                />
              </div>

              {/* 카테고리 선택 */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setEditCategoryId(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                        editCategoryId === cat.id
                          ? 'bg-[#3182F6] text-white'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* 상세 보기 */
            <>
              {/* 금액 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">금액</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(transaction.amount)}
                </span>
              </div>

              {/* 메모 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">메모</span>
                <span className="text-sm text-gray-900">
                  {transaction.memo || '—'}
                </span>
              </div>

              {/* 카테고리 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">카테고리</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{category?.icon ?? '📌'}</span>
                  <span className="text-sm text-gray-900">
                    {category?.name ?? '기타'}
                  </span>
                </div>
              </div>

              {/* 날짜 */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">날짜</span>
                <span className="text-sm text-gray-900">
                  {formatDate(transaction.date)}
                </span>
              </div>

              {/* AI 분류 뱃지 */}
              {transaction.aiClassified && !transaction.userModified && (
                <div className="flex justify-end">
                  <span className="text-xs bg-blue-50 text-[#3182F6] px-2 py-0.5 rounded-full">
                    AI 자동 분류
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* 삭제 확인 다이얼로그 */}
        {showDeleteConfirm && (
          <div className="mx-5 mb-4 p-4 bg-red-50 rounded-xl">
            <p className="text-sm text-red-700 mb-3">
              이 내역을 삭제할까요? 되돌릴 수 없습니다.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 text-sm text-white bg-red-500 rounded-xl"
              >
                삭제
              </button>
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex gap-2 px-5 pb-8 pt-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancelEdit}
                className="flex-1 py-3 text-sm text-gray-700 bg-gray-100 rounded-xl"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 text-sm text-white bg-[#3182F6] rounded-xl disabled:opacity-60"
              >
                {isSaving ? '저장 중…' : '저장'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 py-3 text-sm text-red-500 bg-red-50 rounded-xl"
              >
                삭제
              </button>
              <button
                onClick={handleStartEdit}
                className="flex-1 py-3 text-sm text-white bg-[#3182F6] rounded-xl"
              >
                수정
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
