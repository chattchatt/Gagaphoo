'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { getBudgetVsIncomeReport } from '@/lib/budget';

interface Props {
  year: number;
  month: number;
}

// 월 YYYY-MM 포맷
function toMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export default function BudgetIncomeReport({ year, month }: Props) {
  const monthKey = toMonthKey(year, month);

  // getBudgetVsIncomeReport는 DB 쿼리를 내부에서 수행하므로 useLiveQuery로 래핑
  const report = useLiveQuery(() => getBudgetVsIncomeReport(monthKey), [monthKey]);

  if (!report) {
    return (
      <div className="py-10 text-center text-sm text-gray-400">불러오는 중...</div>
    );
  }

  const { rows, summary } = report;

  // 총 수입이 없으면 안내 메시지
  if (summary.totalIncome === 0) {
    return (
      <div className="py-10 text-center text-sm text-gray-400 space-y-1">
        <p>고정 수입이 설정되지 않았습니다.</p>
        <p className="text-xs text-gray-300">설정 &gt; 고정 수입 관리에서 추가해주세요.</p>
      </div>
    );
  }

  // Recharts용 데이터 변환
  const chartData = rows.map((r) => ({
    name: r.categoryName,
    이상적: r.budgetPct,
    실제: r.spentPct,
    color: r.categoryColor,
    icon: r.categoryIcon,
  }));

  // 저축률에 따른 색상
  const savingsColor = summary.savingsRate >= 20 ? '#22C55E' : summary.savingsRate >= 0 ? '#F59E0B' : '#EF4444';

  return (
    <div className="space-y-4">
      {/* 요약 통계 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">월 고정 수입</p>
          <p className="text-base font-bold text-gray-900">
            ₩{summary.totalIncome.toLocaleString('ko-KR')}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">총 지출</p>
          <p className="text-base font-bold text-gray-900">
            ₩{summary.totalSpent.toLocaleString('ko-KR')}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">총 예산</p>
          <p className="text-base font-bold text-gray-900">
            ₩{summary.totalBudget.toLocaleString('ko-KR')}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm px-4 py-3">
          <p className="text-xs text-gray-400 mb-1">저축률</p>
          <p className="text-base font-bold" style={{ color: savingsColor }}>
            {summary.savingsRate}%
          </p>
        </div>
      </div>

      {/* 예산 초과 경고 */}
      {summary.totalBudget > summary.totalIncome && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          <p className="text-sm text-red-500 font-medium">
            총 예산(₩{summary.totalBudget.toLocaleString('ko-KR')})이 고정 수입을 초과합니다.
          </p>
        </div>
      )}

      {/* 카테고리별 비교 차트 */}
      {rows.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm px-4 py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">수입 대비 카테고리별 비율 (%)</h3>
          <ResponsiveContainer width="100%" height={rows.length * 52 + 40}>
            <BarChart
              layout="vertical"
              data={chartData}
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <XAxis
                type="number"
                domain={[0, 'dataMax + 5']}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: '#9CA3AF' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={56}
                tick={{ fontSize: 12, fill: '#374151' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value, name) => [`${value}%`, name]}
                contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #F3F4F6' }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              {/* 이상적 (예산 비율) */}
              <Bar dataKey="이상적" fill="#93C5FD" radius={[0, 4, 4, 0]} barSize={10} />
              {/* 실제 (지출 비율) */}
              <Bar dataKey="실제" radius={[0, 4, 4, 0]} barSize={10}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.실제 > entry.이상적 ? '#FCA5A5' : '#86EFAC'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2 text-center">
            파란색: 예산 목표 비율 · 초록/빨강: 실제 지출 비율
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm py-8 text-center text-sm text-gray-400">
          {month}월 예산이 설정되지 않았습니다.
        </div>
      )}
    </div>
  );
}
