'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { formatCurrency } from '@/lib/format';

// 월별 지출 트렌드 에어리어 차트 (토스 블루 라인 + 연한 블루 그라데이션)
interface Props {
  data: { month: string; amount: number }[];
}

// X축 MM월 포맷
function formatXAxis(month: string): string {
  const parts = month.split('-');
  if (parts.length < 2) return month;
  return `${parseInt(parts[1], 10)}월`;
}

// Y축 만원 단위 축약
function formatYAxis(value: number): string {
  if (value === 0) return '0';
  if (value >= 10000) return `${(value / 10000).toFixed(0)}만`;
  return `${value}`;
}

// 커스텀 툴팁
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-md px-3 py-2 text-sm border border-gray-100">
      <p className="text-gray-500 text-xs">{label ? formatXAxis(label) : ''}</p>
      <p className="font-semibold text-gray-800">{formatCurrency(payload[0].value)}</p>
    </div>
  );
}

export default function TrendLineChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={192}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        {/* SVG 그라데이션 정의 */}
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3182F6" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#3182F6" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* 그리드라인 없음 — 토스 스타일 */}
        <XAxis
          dataKey="month"
          tickFormatter={formatXAxis}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#9CA3AF' }}
        />
        <YAxis
          tickFormatter={formatYAxis}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3182F6', strokeWidth: 1, strokeDasharray: '4 4' }} />

        {/* 에어리어 (그라데이션 채움 + 토스 블루 라인) */}
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#3182F6"
          strokeWidth={2}
          fill="url(#trendGradient)"
          dot={<Dot r={3} fill="#3182F6" stroke="#fff" strokeWidth={2} />}
          activeDot={{ r: 5, fill: '#3182F6', stroke: '#fff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
