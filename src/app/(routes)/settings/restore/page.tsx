'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { importData, summarizeBackup, type BackupData } from '@/lib/backup';

type ImportMode = 'merge' | 'overwrite';

export default function RestorePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일에서 파싱한 백업 데이터
  const [preview, setPreview] = useState<BackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // 병합/덮어쓰기 선택
  const [mode, setMode] = useState<ImportMode>('merge');

  // 복원 상태
  const [restoring, setRestoring] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 토스트 자동 닫기
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  // 파일 선택 처리
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(null);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      try {
        const data = JSON.parse(text) as BackupData;
        // 기본 구조 검증
        if (
          !data.version ||
          !Array.isArray(data.transactions) ||
          !Array.isArray(data.categories)
        ) {
          setParseError('백업 파일 형식이 올바르지 않습니다.');
          return;
        }
        setPreview(data);
      } catch {
        setParseError('JSON 파일을 읽을 수 없습니다.');
      }
    };
    reader.readAsText(file, 'utf-8');
  };

  // 복원 실행
  const handleRestore = async () => {
    if (!preview || restoring) return;

    setRestoring(true);
    try {
      await importData(JSON.stringify(preview), mode);
      setToast('데이터가 복원되었습니다.');
      // 복원 후 미리보기 초기화
      setPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      const message = err instanceof Error ? err.message : '복원에 실패했습니다.';
      setToast(message);
    } finally {
      setRestoring(false);
    }
  };

  const summary = preview ? summarizeBackup(preview) : null;

  return (
    <div className="min-h-screen bg-[var(--surface)] pb-20 md:pb-6">
      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-sm px-4 py-2.5 rounded-full shadow-lg z-50 whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* 상단 헤더 */}
      <div className="bg-[var(--background)] px-5 pt-6 pb-4 border-b border-[var(--border)] flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 -ml-1"
          aria-label="뒤로가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M5 12l7-7M5 12l7 7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-[var(--text-primary)]">데이터 복원</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* 파일 선택 */}
        <section className="bg-[var(--background)] rounded-2xl px-5 py-5 shadow-sm">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">백업 파일 선택</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-3 rounded-xl border-2 border-dashed border-[var(--border)] text-sm text-[var(--text-secondary)] hover:border-[#3182F6] hover:text-[#3182F6] transition-colors"
          >
            {preview ? '다른 파일 선택' : 'JSON 파일 선택'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* 파싱 에러 */}
          {parseError && (
            <p className="mt-2 text-xs text-red-500">{parseError}</p>
          )}
        </section>

        {/* 미리보기 */}
        {preview && summary && (
          <section className="bg-[var(--background)] rounded-2xl px-5 py-4 shadow-sm">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">백업 파일 정보</p>
            <p className="text-xs text-[var(--text-tertiary)] mb-3">
              내보낸 날짜: {new Date(preview.exportedAt).toLocaleString('ko-KR')}
            </p>
            <ul className="space-y-2">
              <PreviewRow label="거래 내역" count={summary.transactions} unit="건" />
              <PreviewRow label="카테고리" count={summary.categories} unit="개" />
              <PreviewRow label="예산 설정" count={summary.budgets} unit="개" />
              <PreviewRow label="반복 지출" count={summary.recurringExpenses} unit="개" />
            </ul>
          </section>
        )}

        {/* 가져오기 방식 선택 */}
        {preview && (
          <section className="bg-[var(--background)] rounded-2xl px-5 py-4 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-[var(--text-primary)]">가져오기 방식</p>

            <ModeOption
              id="merge"
              value="merge"
              selected={mode === 'merge'}
              onSelect={() => setMode('merge')}
              title="병합"
              description="기존 데이터를 유지하고 백업 파일의 데이터를 추가합니다. 같은 ID는 덮어씁니다."
            />
            <ModeOption
              id="overwrite"
              value="overwrite"
              selected={mode === 'overwrite'}
              onSelect={() => setMode('overwrite')}
              title="덮어쓰기"
              description="기존 데이터를 모두 삭제하고 백업 파일로 대체합니다."
            />

            {/* 덮어쓰기 경고 */}
            {mode === 'overwrite' && (
              <div className="bg-red-50 rounded-xl px-4 py-3">
                <p className="text-xs text-red-600">
                  기존의 모든 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            )}
          </section>
        )}

        {/* 복원 버튼 */}
        <button
          type="button"
          onClick={handleRestore}
          disabled={!preview || restoring}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition-all ${
            preview && !restoring
              ? 'bg-[#3182F6] text-white hover:bg-[#1B64DA] active:scale-[0.98]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          {restoring ? '복원 중...' : '복원하기'}
        </button>
      </div>
    </div>
  );
}

// 미리보기 행
function PreviewRow({ label, count, unit }: { label: string; count: number; unit: string }) {
  return (
    <li className="flex items-center justify-between">
      <span className="text-sm text-[var(--text-secondary)]">{label}</span>
      <span className="text-sm font-medium text-[var(--text-primary)]">
        {count.toLocaleString('ko-KR')}
        {unit}
      </span>
    </li>
  );
}

// 가져오기 방식 옵션
function ModeOption({
  id,
  selected,
  onSelect,
  title,
  description,
}: {
  id: string;
  value: string;
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
        selected
          ? 'border-[#3182F6] bg-blue-50'
          : 'border-[var(--border)] hover:border-[var(--text-tertiary)]'
      }`}
    >
      <input
        id={id}
        type="radio"
        checked={selected}
        onChange={onSelect}
        className="mt-0.5 accent-[#3182F6]"
      />
      <div>
        <p className={`text-sm font-medium ${selected ? 'text-[#3182F6]' : 'text-[var(--text-primary)]'}`}>
          {title}
        </p>
        <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">{description}</p>
      </div>
    </label>
  );
}
