'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import {
  calculateDNAScores,
  determineType,
  saveDNAResult,
  getDNAHistory,
  TYPE_INFO,
  type DNAScores,
  type DNAType,
} from '@/lib/spending-dna';
import ShareCard from '@/components/ShareCard';

interface Props {
  year: number;
  month: number;
}

// 레이더 차트 데이터 포맷
function buildRadarData(scores: DNAScores) {
  return [
    { axis: '절약성', value: scores.saving },
    { axis: '계획성', value: scores.planning },
    { axis: '다양성', value: scores.diversity },
    { axis: '충동성', value: scores.impulse },
    { axis: '투자성', value: scores.investment },
  ];
}

export default function SpendingDNAChart({ year, month }: Props) {
  const [scores, setScores] = useState<DNAScores | null>(null);
  const [primaryType, setPrimaryType] = useState<DNAType | null>(null);
  const [secondaryType, setSecondaryType] = useState<DNAType | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof getDNAHistory>>>([]);
  const [loading, setLoading] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);

  // 저장된 히스토리 로드
  const loadHistory = useCallback(async () => {
    const h = await getDNAHistory();
    setHistory(h);

    // 현재 월 데이터가 있으면 화면에 표시
    const monthStr = `${year}-${String(month).padStart(2, '0')}`;
    const current = h.find((r) => r.month === monthStr);
    if (current) {
      setScores(current.scores);
      setPrimaryType(current.primaryType as DNAType);
      setSecondaryType(current.secondaryType as DNAType);
    }
  }, [year, month]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 분석하기: 계산 → 저장 → 화면 갱신
  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const newScores = await calculateDNAScores();
      const { primaryType: pt, secondaryType: st } = determineType(newScores);
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      await saveDNAResult(monthStr, newScores, pt, st);
      setScores(newScores);
      setPrimaryType(pt);
      setSecondaryType(st);
      await loadHistory();
    } finally {
      setLoading(false);
    }
  };

  const radarData = scores ? buildRadarData(scores) : null;
  const typeInfo = primaryType ? TYPE_INFO[primaryType] : null;
  const secondaryInfo = secondaryType ? TYPE_INFO[secondaryType] : null;

  // 최근 6개월만 표시
  const recentHistory = history.slice(0, 6);

  return (
    <div className="glass-card p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          소비 DNA 분석
        </h2>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: 'var(--primary)' }}
        >
          {loading ? '분석 중…' : '분석하기'}
        </button>
      </div>

      {!scores ? (
        // 데이터 없음 안내
        <div className="flex flex-col items-center justify-center py-10 space-y-2">
          <span className="text-3xl">🧬</span>
          <p className="text-sm text-center" style={{ color: 'var(--text-secondary)' }}>
            3개월 이상의 데이터가 필요합니다.
            <br />
            거래를 입력한 뒤 분석하기를 눌러주세요.
          </p>
        </div>
      ) : (
        <>
          {/* 레이더 차트 */}
          <div className="w-full h-60">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData!} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  dataKey="value"
                  stroke="#3182F6"
                  fill="#3182F6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* 유형 설명 */}
          {typeInfo && (
            <div className="glass-card-heavy p-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{typeInfo.icon}</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {typeInfo.name}
                    {secondaryInfo && (
                      <span className="ml-1 font-normal text-xs" style={{ color: 'var(--text-secondary)' }}>
                        + {secondaryInfo.icon} {secondaryInfo.name}
                      </span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {typeInfo.description}
                  </p>
                </div>
              </div>
              <p className="text-xs pt-1 pl-8" style={{ color: 'var(--primary)' }}>
                💡 {typeInfo.advice}
              </p>
            </div>
          )}

          {/* 공유 카드 버튼 */}
          {primaryType && secondaryType && (
            <button
              onClick={() => setShowShareCard((v) => !v)}
              className="w-full py-2.5 rounded-xl text-sm font-medium border transition-colors"
              style={{
                color: 'var(--primary)',
                borderColor: 'var(--primary)',
                background: 'transparent',
              }}
            >
              {showShareCard ? '카드 닫기' : '공유 카드 만들기'}
            </button>
          )}

          {/* 공유 카드 */}
          {showShareCard && scores && primaryType && secondaryType && (
            <ShareCard scores={scores} primaryType={primaryType} secondaryType={secondaryType} />
          )}
        </>
      )}

      {/* 최근 6개월 히스토리 */}
      {recentHistory.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
            유형 변화 히스토리
          </p>
          <div className="space-y-1.5">
            {recentHistory.map((r) => {
              const info = TYPE_INFO[r.primaryType as DNAType];
              const secInfo = TYPE_INFO[r.secondaryType as DNAType];
              return (
                <div
                  key={r.month}
                  className="flex items-center justify-between px-3 py-2 rounded-xl"
                  style={{ background: 'var(--surface)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {r.month}
                  </span>
                  <span className="text-sm">
                    {info?.icon} {info?.name}
                    {secInfo && (
                      <span className="text-xs ml-1" style={{ color: 'var(--text-secondary)' }}>
                        + {secInfo.icon}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
