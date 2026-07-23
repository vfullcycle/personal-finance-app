import { useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { satangToBaht, formatSatangAsBaht } from '../../lib/money'
import { useNetWorthHistory, type NetWorthPoint } from './useNetWorthHistory'
import { DeltaChip } from './DeltaChip'

const RANGE_OPTIONS: { value: number; label: string }[] = [
  { value: 6, label: '6 เดือน' },
  { value: 12, label: '12 เดือน' },
  { value: 24, label: '24 เดือน' },
  { value: 60, label: 'ทั้งหมด' },
]

function compactBaht(satang: number): string {
  return new Intl.NumberFormat('th-TH', { notation: 'compact', maximumFractionDigits: 1 }).format(satangToBaht(satang))
}

function monthTick(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' })
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: NetWorthPoint }[] }) {
  if (!active || !payload || payload.length === 0) return null
  const point = payload[0].payload
  const label = new Date(point.as_of).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">{label}</div>
      <div className="chart-tooltip-value">{formatSatangAsBaht(point.net_worth)} บาท</div>
    </div>
  )
}

export function NetWorthChart() {
  const [monthCount, setMonthCount] = useState(12)
  const { points, loading, error } = useNetWorthHistory(monthCount)

  if (loading) return <div className="empty-state">กำลังโหลด...</div>
  if (error) return <div className="banner-error">{error}</div>
  if (points.length === 0) return <div className="empty-state">ยังไม่มีข้อมูลเพียงพอสำหรับแสดงแนวโน้ม</div>

  const first = points[0]
  const last = points[points.length - 1]

  return (
    <div>
      <div className="radio-group">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`radio-chip${monthCount === opt.value ? ' active' : ''}`}
            onClick={() => setMonthCount(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="chart-headline">
        <div className="chart-headline-value">{formatSatangAsBaht(last.net_worth)} บาท</div>
        <DeltaChip current={last.net_worth} previous={first.net_worth} goodDirection="up" />
      </div>

      <div className="card" style={{ height: 260, padding: '16px 8px 8px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="as_of"
              tickFormatter={monthTick}
              stroke="var(--text-muted)"
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
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
              dataKey="net_worth"
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
    </div>
  )
}
