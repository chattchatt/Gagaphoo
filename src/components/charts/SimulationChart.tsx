'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  getAverageMonthly,
  projectSavings,
  calculateGoalTimeline,
  getCategoryImpact,
  MonthlyAverage,
  MonthlyAdjustments,
} from '@/lib/simulation';
import { formatCurrency } from '@/lib/format';

interface Props {
  year: number;
  month: number;
}

// Y축 만원 단위 포맷
function formatYAxis(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(0)}만`;
  return `${value}`;
}

// YYYY-MM → N월 표시
function formatMonthLabel(ym: string): string {
  const parts = ym.split('-');
  if (parts.length < 2) return ym;
  return `${parseInt(parts[1], 10)}월`;
}

// 커스텀 툴팁
function SimTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white rounded-xl shadow-md px-3 py-2 text-sm border border-gray-100">
      <p className="text-gray-400 text-xs mb-1">{label ? formatMonthLabel(label) : ''}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-semibold" style={{ color: p.color }}>
          {p.name === 'base' ? '기본' : '절약'} {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

// 카테고리 아이콘 매핑 (카테고리명 기반 간단 매핑)
function getCategoryIcon(name: string): string {
  const map: Record<string, string> = {
    식비: '🍚',
    교통: '🚌',
    쇼핑: '🛍️',
    구독: '📱',
    문화: '🎬',
    의료: '💊',
    교육: '📚',
    여행: '✈️',
    카페: '☕',
    주거: '🏠',
    통신: '📡',
    기타: '💳',
  };
  for (const [key, icon] of Object.entries(map)) {
    if (name.includes(key)) return icon;
  }
  return '💳';
}

export default function SimulationChart({ year, month }: Props) {
  // 평균 수입/지출/저축
  const [average, setAverage] = useState<MonthlyAverage | null>(null);
  // 기본 시나리오 누적 저축 배열
  const [baseSavings, setBaseSavings] = useState<number[]>([]);
  // 절약 시나리오 누적 저축 배열
  const [adjustedSavings, setAdjustedSavings] = useState<number[]>([]);
  // 카테고리별 임팩트
  const [categories, setCategories] = useState<
    { categoryId: number; name: string; monthlyAverage: number; percentage: number }[]
  >([]);
  // 슬라이더 조정값: categoryId → 절약 퍼센트 (0~100)
  const [adjustments, setAdjustments] = useState<Record<number, number>>({});
  // 목표 금액 (문자열로 관리 → 쉼표 포맷)
  const [goalInput, setGoalInput] = useState<string>('');
  // 기본 목표 소요 기간
  const [baseTimeline, setBaseTimeline] = useState<{ months: number; achievable: boolean } | null>(null);
  // 절약 시 목표 소요 기간
  const [adjustedTimeline, setAdjustedTimeline] = useState<{ months: number; achievable: boolean } | null>(null);
  // 로딩
  const [loading, setLoading] = useState(true);

  // 초기 데이터 로드
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [avg, base, cats] = await Promise.all([
        getAverageMonthly(3),
        projectSavings(12),
        getCategoryImpact(),
      ]);
      setAverage(avg);
      setBaseSavings(base);
      setCategories(cats);
      setLoading(false);
    }
    load();
  }, []);

  // adjustments 변경 시 절약 시나리오 재계산
  useEffect(() => {
    if (!average) return;

    // 카테고리별 절약액 합산 → expenseChange (음수)
    let totalSaving = 0;
    for (const cat of categories) {
      const pct = adjustments[cat.categoryId] ?? 0;
      totalSaving += cat.monthlyAverage * (pct / 100);
    }

    const adj: MonthlyAdjustments = { expenseChange: -Math.round(totalSaving) };

    projectSavings(12, adj).then(setAdjustedSavings);

    // 목표 소요 기간 재계산
    const targetVal = parseInt(goalInput.replace(/,/g, ''), 10);
    if (!isNaN(targetVal) && targetVal > 0) {
      calculateGoalTimeline(targetVal, adj).then(setAdjustedTimeline);
    } else {
      setAdjustedTimeline(null);
    }
  }, [adjustments, average, categories, goalInput]);

  // 목표 금액 변경 시 기본 소요 기간 계산
  useEffect(() => {
    const targetVal = parseInt(goalInput.replace(/,/g, ''), 10);
    if (!isNaN(targetVal) && targetVal > 0) {
      calculateGoalTimeline(targetVal).then(setBaseTimeline);
    } else {
      setBaseTimeline(null);
    }
  }, [goalInput]);

  // 슬라이더 월 절약 합계
  const totalMonthlySaving = categories.reduce((sum, cat) => {
    const pct = adjustments[cat.categoryId] ?? 0;
    return sum + cat.monthlyAverage * (pct / 100);
  }, 0);

  // 차트 데이터 조합: 현재 월 기준 12개월
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(year, month - 1 + i + 1, 1); // month는 1-indexed
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return {
      month: label,
      base: baseSavings[i] ?? 0,
      adjusted: adjustedSavings[i] ?? 0,
    };
  });

  // 목표 금액 input 포맷 핸들러
  function handleGoalInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    if (raw === '') {
      setGoalInput('');
      return;
    }
    setGoalInput(Number(raw).toLocaleString());
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        데이터를 불러오는 중...
      </div>
    );
  }

  const goalTarget = parseInt(goalInput.replace(/,/g, ''), 10);
  const hasGoal = !isNaN(goalTarget) && goalTarget > 0;
  const monthReduction =
    hasGoal && baseTimeline?.achievable && adjustedTimeline?.achievable
      ? baseTimeline.months - adjustedTimeline.months
      : null;

  return (
    <div className="space-y-4">
      {/* 상단 요약 카드 3개 */}
      <div className="grid grid-cols-3 gap-3">
        {/* 월평균 수입 */}
        <div className="glass-card p-3">
          <p className="text-xs text-gray-400 mb-1">월평균 수입</p>
          <p className="text-sm font-bold text-blue-500">
            {formatCurrency(average?.income ?? 0)}
          </p>
        </div>
        {/* 월평균 지출 */}
        <div className="glass-card p-3">
          <p className="text-xs text-gray-400 mb-1">월평균 지출</p>
          <p className="text-sm font-bold text-red-400">
            {formatCurrency(average?.expense ?? 0)}
          </p>
        </div>
        {/* 월평균 저축 */}
        <div className="glass-card p-3">
          <p className="text-xs text-gray-400 mb-1">월평균 저축</p>
          <p
            className={`text-sm font-bold ${
              (average?.savings ?? 0) >= 0 ? 'text-green-500' : 'text-red-400'
            }`}
          >
            {formatCurrency(average?.savings ?? 0)}
          </p>
        </div>
      </div>

      {/* 예측 차트 */}
      <div className="glass-card p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          12개월 누적 저축 예측
        </p>
        <ResponsiveContainer width="100%" height={250}>
          <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="simBaseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B0B8C1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#B0B8C1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="simAdjGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3182F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3182F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="month"
              tickFormatter={formatMonthLabel}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
            />
            <YAxis
              tickFormatter={formatYAxis}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              width={40}
            />
            <Tooltip content={<SimTooltip />} />
            <Legend
              formatter={(value) => (value === 'base' ? '기본' : '절약 시나리오')}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12 }}
            />
            {/* 기본 시나리오: 회색 */}
            <Area
              type="monotone"
              dataKey="base"
              stroke="#B0B8C1"
              strokeWidth={2}
              fill="url(#simBaseGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#B0B8C1', stroke: '#fff', strokeWidth: 2 }}
            />
            {/* 절약 시나리오: 파랑 */}
            <Area
              type="monotone"
              dataKey="adjusted"
              stroke="#3182F6"
              strokeWidth={2}
              fill="url(#simAdjGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#3182F6', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 카테고리별 절약 슬라이더 */}
      <div className="glass-card p-4 space-y-3">
        {/* 슬라이더 헤더: 합계 절약액 */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--text-primary)]">카테고리별 절약 설정</p>
          {totalMonthlySaving > 0 && (
            <span className="text-xs font-bold text-blue-500 bg-blue-50 rounded-full px-2 py-0.5">
              월 {formatCurrency(Math.round(totalMonthlySaving))} 절약 가능
            </span>
          )}
        </div>

        {categories.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">지출 데이터가 없습니다</p>
        ) : (
          categories.map((cat) => {
            const pct = adjustments[cat.categoryId] ?? 0;
            const saving = cat.monthlyAverage * (pct / 100);
            return (
              <div key={cat.categoryId} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-[var(--text-primary)] font-medium">
                    <span>{getCategoryIcon(cat.name)}</span>
                    <span>{cat.name}</span>
                  </span>
                  <span className="text-gray-400">
                    월평균 {formatCurrency(cat.monthlyAverage)}
                    {pct > 0 && (
                      <span className="ml-1 text-blue-500 font-semibold">
                        → {formatCurrency(Math.round(cat.monthlyAverage - saving))}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={10}
                    value={pct}
                    onChange={(e) =>
                      setAdjustments((prev) => ({
                        ...prev,
                        [cat.categoryId]: Number(e.target.value),
                      }))
                    }
                    className="flex-1 h-1.5 accent-blue-500 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-blue-500 w-8 text-right">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 목표 설정 섹션 */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-sm font-semibold text-[var(--text-primary)]">목표 금액 설정</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">₩</span>
          <input
            type="text"
            inputMode="numeric"
            value={goalInput}
            onChange={handleGoalInput}
            placeholder="목표 금액 입력"
            className="flex-1 bg-transparent border-b border-gray-200 focus:border-blue-400 outline-none text-sm py-1 text-[var(--text-primary)] placeholder-gray-300"
          />
        </div>

        {hasGoal && baseTimeline && (
          <div className="space-y-2 pt-1">
            {/* 기본 소요 기간 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">현재 저축 속도</span>
              <span className="font-semibold text-[var(--text-primary)]">
                {baseTimeline.achievable ? `${baseTimeline.months}개월` : '달성 불가'}
              </span>
            </div>

            {/* 절약 시 소요 기간 */}
            {adjustedTimeline && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">절약 시나리오</span>
                <span className="font-semibold text-blue-500">
                  {adjustedTimeline.achievable ? `${adjustedTimeline.months}개월` : '달성 불가'}
                </span>
              </div>
            )}

            {/* 단축 기간 강조 */}
            {monthReduction !== null && monthReduction > 0 && (
              <div className="flex items-center justify-center mt-2 py-2 bg-blue-50 rounded-xl">
                <span className="text-sm font-bold text-blue-600">
                  {monthReduction}개월 단축!
                </span>
              </div>
            )}
            {monthReduction !== null && monthReduction <= 0 && adjustedTimeline?.achievable && (
              <div className="flex items-center justify-center mt-2 py-2 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-400">슬라이더를 조정해 목표 기간을 단축하세요</span>
              </div>
            )}
            {baseTimeline && !baseTimeline.achievable && (
              <div className="flex items-center justify-center mt-2 py-2 bg-red-50 rounded-xl">
                <span className="text-sm text-red-400">지출이 수입보다 많아 목표 달성이 어렵습니다</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
