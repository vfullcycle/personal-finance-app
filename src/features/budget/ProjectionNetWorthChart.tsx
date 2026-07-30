import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { satangToBaht, formatSatangAsBaht } from '../../lib/money'

export type ProjectionChartPoint = { label: string; netWorth: number }

function compactBaht(satang: number): string {
  return new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 }).format(satangToBaht(satang))
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: ProjectionChartPoint }[] }) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{point.label}</div>
      <div className="chart-tooltip-value">{formatSatangAsBaht(point.netWorth)} บาท</div>
    </div>
  )
}

// กราฟ net worth คาดการณ์ล่วงหน้า — style เดียวกับ NetWorthChart.tsx (C4) เพื่อความสม่ำเสมอทั้งแอป
export function ProjectionNetWorthChart({ points }: { points: ProjectionChartPoint[] }) {
  if (points.length === 0) return <div className="empty-state">ยังไม่มีข้อมูลเพียงพอสำหรับแสดงแนวโน้ม</div>

  return (
    <div className="card" style={{ height: 260, padding: '16px 8px 8px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={compactBaht}
            stroke="var(--text-muted)"
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={56}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="var(--brand)"
            strokeWidth={2}
            fill="var(--brand)"
            fillOpacity={0.1}
            activeDot={{ r: 5, stroke: 'var(--surface)', strokeWidth: 2 }}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
