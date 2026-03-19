'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { formatCurrency } from '@/lib/format';

// 월별 지출 바 차트
interface Props {
  data: { month: string; amount: number }[];
  currentMonth: string; // "2024-03" 형식
}

// Y축 만원 단위 축약 포맷
function formatYAxis(value: number): string {
  if (value === 0) return '0';
  if (value >= 10000) return `${(value / 10000).toFixed(0)}만`;
  return `${value}`;
}

// X축 MM월 포맷 ("2024-03" → "3월")
function formatXAxis(month: string): string {
  const parts = month.split('-');
  if (parts.length < 2) return month;
  return `${parseInt(parts[1], 10)}월`;
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

export default function MonthlyBarChart({ data, currentMonth }: Props) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={192}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
        {/* 그리드라인 숨김 — 토스 스타일 */}
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
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.month}
              fill={entry.month === currentMonth ? '#3182F6' : '#E5E8EB'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
