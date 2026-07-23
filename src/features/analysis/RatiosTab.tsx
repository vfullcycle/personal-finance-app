import { buildRatioGroups, type AnalysisFigures, type RatioStatus } from './ratioCalculations'

function formatRatioValue(value: number | null, format: 'percent' | 'multiple'): string {
  if (value === null) return '—'
  return format === 'percent' ? `${(value * 100).toFixed(1)}%` : `${value.toFixed(2)} เท่า`
}

function badgeClass(status: RatioStatus): string {
  if (status === 'pass') return 'badge'
  if (status === 'fail') return 'badge badge-bad'
  return 'badge badge-muted'
}

export function RatiosTab({ figures }: { figures: AnalysisFigures }) {
  const groups = buildRatioGroups(figures)

  return (
    <div>
      <div className="field-hint" style={{ margin: '0 0 16px' }}>
        คำนวณจากข้อมูลกระแสเงินสด/รายได้ {figures.months} เดือนล่าสุด และยอดคงเหลือ ณ วันนี้ (งบดุล) — รายได้สุทธิ (take-home) เฟส 1
        ยังไม่หักภาษี DSR จะดูดีกว่าความจริงเล็กน้อยจนกว่าโมดูลภาษีจะเสร็จ
      </div>

      {groups.map((g) => (
        <div key={g.id}>
          <div className="group-title">{g.label}</div>
          <div className="card">
            {g.ratios.map((r) => (
              <div key={r.id} className="report-row">
                <div className="report-row-name">
                  {r.label}
                  <span className="report-row-pct">
                    {r.formula} · เกณฑ์ {r.benchmarkLabel}
                  </span>
                </div>
                <div className="report-row-values">
                  <span className="report-row-amount">{formatRatioValue(r.value, r.format)}</span>
                  <span className={badgeClass(r.status)}>{r.statusLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
