'use client';

import { useState, useEffect, useCallback } from 'react';
import { aggregateMonthlyData, getCachedCoaching, saveCoachingCache } from '@/lib/coaching';
import type { CoachingResponse } from '@/app/api/coaching/route';

interface CoachingLetterProps {
  year: number;
  month: number;
}

// YYYY-MM 형식 변환 헬퍼
function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export default function CoachingLetter({ year, month }: CoachingLetterProps) {
  const monthKey = toMonthKey(year, month);

  const [coaching, setCoaching] = useState<CoachingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 컴포넌트 마운트 시 캐시 확인
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await getCachedCoaching(monthKey);
      if (cancelled) return;
      if (cached) {
        try {
          setCoaching(JSON.parse(cached) as CoachingResponse);
        } catch {
          // 파싱 실패 시 캐시 무시
        }
      }
    })();
    return () => { cancelled = true; };
  }, [monthKey]);

  // 리포트 생성 버튼 클릭 핸들러
  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. 월간 집계 데이터 생성
      const monthlyData = await aggregateMonthlyData(monthKey);

      // 2. AI 코칭 API 호출
      const res = await fetch('/api/coaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyData }),
      });

      if (!res.ok) {
        throw new Error(`API 오류: ${res.status}`);
      }

      const data = (await res.json()) as CoachingResponse;

      // 3. 결과 저장 및 캐시
      setCoaching(data);
      await saveCoachingCache(monthKey, JSON.stringify(data));
    } catch {
      setError('리포트 생성에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  // 로딩 스켈레톤
  if (loading) {
    return (
      <div className="space-y-3 p-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-full mb-1" />
            <div className="h-3 bg-gray-100 rounded w-4/5" />
          </div>
        ))}
      </div>
    );
  }

  // 캐시 없는 초기 상태 — 리포트 생성 버튼
  if (!coaching) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <p className="text-sm text-gray-500 text-center">
          AI가 이번 달 소비 패턴을 분석하여<br />맞춤 코칭 리포트를 생성합니다.
        </p>
        {error && (
          <p className="text-sm text-red-500 text-center">{error}</p>
        )}
        <button
          type="button"
          onClick={generateReport}
          className="px-5 py-2.5 rounded-xl bg-[#3182F6] text-white text-sm font-semibold hover:bg-[#1a6fe0] active:scale-95 transition-all"
        >
          리포트 생성
        </button>
      </div>
    );
  }

  // 코칭 결과 표시
  return (
    <div className="space-y-4 p-1">
      {/* 인사이트 — 좌측 파랑 보더 */}
      {coaching.insights.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
            인사이트
          </h3>
          <div className="space-y-2">
            {coaching.insights.map((item, idx) => (
              <div
                key={idx}
                className="glass-card p-3 border-l-4 border-blue-400"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">{item.title}</span>
                  {item.changePercent !== 0 && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                      item.changePercent > 0
                        ? 'bg-red-50 text-red-500'
                        : 'bg-green-50 text-green-600'
                    }`}>
                      {item.changePercent > 0 ? '+' : ''}{item.changePercent}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
                {item.category && (
                  <span className="inline-block mt-1.5 text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
                    {item.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 패턴 — 좌측 주황 보더 */}
      {coaching.patterns.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
            패턴
          </h3>
          <div className="space-y-2">
            {coaching.patterns.map((item, idx) => (
              <div
                key={idx}
                className="glass-card p-3 border-l-4 border-orange-400"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">{item.title}</span>
                  {item.severity === 'warning' && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-500">
                      주의
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 팁 — 좌측 초록 보더 */}
      {coaching.tips.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">
            절약 팁
          </h3>
          <div className="space-y-2">
            {coaching.tips.map((item, idx) => (
              <div
                key={idx}
                className="glass-card p-3 border-l-4 border-green-400"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-800">{item.title}</span>
                  {item.savingsEstimate > 0 && (
                    <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">
                      ~{item.savingsEstimate.toLocaleString()}원 절약
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 재생성 버튼 */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={generateReport}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          다시 생성
        </button>
      </div>
    </div>
  );
}
