'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { exportData, downloadAsFile, summarizeBackup, type BackupData } from '@/lib/backup';

export default function BackupPage() {
  const router = useRouter();

  // 현재 DB 데이터 요약
  const [summary, setSummary] = useState<ReturnType<typeof summarizeBackup> | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // 토스트 자동 닫기
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1500);
    return () => clearTimeout(t);
  }, [toast]);

  // 데이터 요약 로드
  useEffect(() => {
    exportData()
      .then((data: BackupData) => setSummary(summarizeBackup(data)))
      .catch(() => setToast('데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  // 내보내기 실행
  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const data = await exportData();
      downloadAsFile(data);
      setToast('백업 파일을 다운로드했습니다.');
    } catch {
      setToast('내보내기에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setExporting(false);
    }
  };

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
        <h1 className="text-xl font-bold text-[var(--text-primary)]">데이터 백업</h1>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* 데이터 요약 카드 */}
        <section className="bg-[var(--background)] rounded-2xl px-5 py-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">현재 저장된 데이터</h2>

          {loading ? (
            <p className="text-sm text-[var(--text-tertiary)]">불러오는 중...</p>
          ) : summary ? (
            <ul className="space-y-2">
              <SummaryRow label="거래 내역" count={summary.transactions} unit="건" />
              <SummaryRow label="카테고리" count={summary.categories} unit="개" />
              <SummaryRow label="예산 설정" count={summary.budgets} unit="개" />
              <SummaryRow label="반복 지출" count={summary.recurringExpenses} unit="개" />
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-tertiary)]">데이터를 불러올 수 없습니다.</p>
          )}
        </section>

        {/* 안내 문구 */}
        <div className="bg-blue-50 rounded-2xl px-5 py-4">
          <p className="text-sm text-blue-700 leading-relaxed">
            모든 거래 내역, 카테고리, 예산 데이터를 JSON 파일로 내보냅니다.
            내보낸 파일은 복원 메뉴에서 다시 가져올 수 있습니다.
          </p>
        </div>

        {/* 내보내기 버튼 */}
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || loading}
          className={`w-full py-4 rounded-2xl text-base font-semibold transition-all ${
            !exporting && !loading
              ? 'bg-[#3182F6] text-white hover:bg-[#1B64DA] active:scale-[0.98]'
              : 'bg-gray-100 text-gray-300 cursor-not-allowed'
          }`}
        >
          {exporting ? '내보내는 중...' : 'JSON으로 내보내기'}
        </button>
      </div>
    </div>
  );
}

// 요약 행 컴포넌트
function SummaryRow({ label, count, unit }: { label: string; count: number; unit: string }) {
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
