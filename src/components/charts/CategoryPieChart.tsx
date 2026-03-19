'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/format';

// 카테고리별 지출 도넛 차트
export interface CategoryPieChartData {
  name: string;
  amount: number;
  color: string;
  icon: string;
}

interface Props {
  data: CategoryPieChartData[];
}

// 커스텀 툴팁
function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; payload: CategoryPieChartData }>;
  total: number;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const item = payload[0];
  const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';

  return (
    <div className="bg-white rounded-xl shadow-md px-3 py-2 text-sm border border-gray-100">
      <p className="font-semibold text-gray-800">
        {item.payload.icon} {item.name}
      </p>
      <p className="text-gray-600">{formatCurrency(item.value)}</p>
      <p className="text-gray-400 text-xs">{percent}%</p>
    </div>
  );
}

// 중앙 총 금액 라벨 (SVG foreignObject 대신 절대 위치로 오버레이)
function CenterLabel({ total }: { total: number }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
      <span className="text-xs text-gray-400">총 지출</span>
      <span className="text-base font-bold text-gray-800 mt-0.5">
        {formatCurrency(total)}
      </span>
    </div>
  );
}

export default function CategoryPieChart({ data }: Props) {
  // 금액 기준 내림차순 정렬, 0원 항목 제외
  const filtered = data.filter((d) => d.amount > 0).sort((a, b) => b.amount - a.amount);
  const total = filtered.reduce((sum, d) => sum + d.amount, 0);

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="relative w-full h-48">
      <CenterLabel total={total} />
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={filtered}
            dataKey="amount"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="60%"
            outerRadius="80%"
            strokeWidth={0}
          >
            {filtered.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            content={<CustomTooltip total={total} />}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
