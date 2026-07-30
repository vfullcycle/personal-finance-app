import { Fragment, useMemo, useState } from 'react'
import { formatSatangAsBaht } from '../../lib/money'
import { todayLocalDateString } from '../../lib/date'
import { YEAR_CUT_MODE_LABEL } from './types'
import { useProjection } from './useProjection'
import { aggregateToAnnual, type AnnualProjectionRow, type MonthlyProjectionRow, type YearCutMode } from './projectionCalculations'
import { ProjectionNetWorthChart, type ProjectionChartPoint } from './ProjectionNetWorthChart'

function monthlyLabel(row: MonthlyProjectionRow): string {
  return `${String(row.month).padStart(2, '0')}/${String(row.beYear).slice(-2)}`
}

export function ProjectionTab() {
  const [closingDate, setClosingDate] = useState(todayLocalDateString())
  const [totalYears, setTotalYears] = useState(5)
  const [monthlyYears, setMonthlyYears] = useState(2)
  const [cutMode, setCutMode] = useState<YearCutMode>('calendar')

  const { result, loading, startingNetWorth } = useProjection({ closingDateIso: closingDate, totalYears, cutMode })

  const monthlyDisplayRows = useMemo(
    () => (result ? result.monthlyRows.filter((r) => r.projectionYearIndex <= monthlyYears) : []),
    [result, monthlyYears],
  )
  const annualDisplayRows = useMemo(
    () => (result ? aggregateToAnnual(result.monthlyRows.filter((r) => r.projectionYearIndex > monthlyYears)) : []),
    [result, monthlyYears],
  )

  const chartPoints: ProjectionChartPoint[] = useMemo(() => {
    const monthlyPoints = monthlyDisplayRows.map((r) => ({ label: monthlyLabel(r), netWorth: r.netWorthCumulative }))
    const annualPoints = annualDisplayRows.map((r) => ({ label: `ปี ${r.beYear}`, netWorth: r.netWorthEnd }))
    return [...monthlyPoints, ...annualPoints]
  }, [monthlyDisplayRows, annualDisplayRows])

  const lastRow = result && result.monthlyRows.length > 0 ? result.monthlyRows[result.monthlyRows.length - 1] : null
  const avgMonthlyNetCashFlow =
    result && result.monthlyRows.length > 0
      ? result.monthlyRows.reduce((s, r) => s + r.netCashFlow, 0) / result.monthlyRows.length
      : 0

  const monthlyByYear = useMemo(() => {
    const map = new Map<number, MonthlyProjectionRow[]>()
    for (const row of monthlyDisplayRows) {
      const list = map.get(row.projectionYearIndex) ?? []
      list.push(row)
      map.set(row.projectionYearIndex, list)
    }
    return [...map.entries()].sort(([a], [b]) => a - b)
  }, [monthlyDisplayRows])

  const invalidM = monthlyYears > totalYears

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="field">
          <label htmlFor="projClosingDate">วันที่ปิดบัญชี</label>
          <input id="projClosingDate" type="date" value={closingDate} onChange={(e) => setClosingDate(e.target.value)} />
          <div className="field-hint">จุดเริ่มต้นคาดการณ์ — เดือนถัดจากวันนี้เป็นเดือนแรกที่คาดการณ์</div>
        </div>
        <div className="field" style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="projTotalYears">ระยะรวม N (ปี)</label>
            <input
              id="projTotalYears"
              type="number"
              min={1}
              max={30}
              value={totalYears}
              onChange={(e) => setTotalYears(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="projMonthlyYears">แสดงรายเดือน M ปีแรก</label>
            <input
              id="projMonthlyYears"
              type="number"
              min={0}
              max={totalYears}
              value={monthlyYears}
              onChange={(e) => setMonthlyYears(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        </div>
        {invalidM && <div className="banner-error">M ต้องไม่มากกว่า N</div>}
        <div className="field">
          <label>โหมดตัดปี</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(Object.entries(YEAR_CUT_MODE_LABEL) as [YearCutMode, string][]).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={cutMode === value ? 'btn' : 'btn-secondary btn'}
                style={{ flex: 1 }}
                onClick={() => setCutMode(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="empty-state">กำลังคำนวณ...</div>}

      {!loading && result && !invalidM && (
        <>
          {result.extrapolatedYears.length > 0 && (
            <div className="banner-info">
              ปีภาษี {result.extrapolatedYears.join(', ')} ยังไม่มี config ภาษีจริง — ใช้ config ปีล่าสุดที่มีประมาณการแทน
            </div>
          )}
          {result.noTaxDataYears.length > 0 && (
            <div className="banner-error">ปีภาษี {result.noTaxDataYears.join(', ')} ไม่มี config ภาษีเลย — คำนวณแบบยังไม่หักภาษี</div>
          )}
          <div className="field-hint" style={{ margin: '0 0 16px' }}>
            ค่าลดหย่อนที่ใช้คำนวณภาษีทุกปี = เฉพาะรายการที่ติ๊ก "ใช้ในงบประมาณ" ไว้ในหน้า "ภาษี" แท็บค่าลดหย่อน (ยอดคงที่ ไม่ปรับตามเงินเฟ้อ)
            — ฐานคำนวณมาจากชั้น A+B เท่านั้น ไม่รวมรายการประจำจริงจาก M4
          </div>

          <div className="report-row">
            <div className="report-row-name">Net worth ปัจจุบัน</div>
            <div className="report-row-values">
              <span className="report-row-amount">{formatSatangAsBaht(startingNetWorth)} บาท</span>
            </div>
          </div>
          <div className="report-row">
            <div className="report-row-name">Net worth ปลายปีที่ {totalYears}</div>
            <div className="report-row-values">
              <span className="report-row-amount">{formatSatangAsBaht(lastRow?.netWorthCumulative ?? startingNetWorth)} บาท</span>
            </div>
          </div>
          <div className="report-row" style={{ marginBottom: 16 }}>
            <div className="report-row-name">กระแสเงินสดสุทธิเฉลี่ย/เดือน (ตลอด {totalYears} ปี)</div>
            <div className="report-row-values">
              <span className="report-row-amount">{formatSatangAsBaht(avgMonthlyNetCashFlow)} บาท</span>
            </div>
          </div>

          <ProjectionNetWorthChart points={chartPoints} />

          <div className="group-title" style={{ marginTop: 16 }}>
            รายละเอียด — {monthlyYears} ปีแรกรายเดือน, ที่เหลือรายปี
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>ช่วง</th>
                  <th>รับเข้า</th>
                  <th>จ่ายออก</th>
                  <th>โยกเข้าสินทรัพย์</th>
                  <th>เงินต้นผ่อนหนี้</th>
                  <th>ดอกเบี้ยเงินกู้</th>
                  <th>กระแสเงินสดสุทธิ</th>
                  <th>Net worth สะสม</th>
                </tr>
              </thead>
              <tbody>
                {monthlyByYear.map(([yearIndex, rows]) => (
                  <Fragment key={`y${yearIndex}`}>
                    <tr className="data-table-year-header">
                      <td colSpan={8}>ปีที่ {yearIndex} (พ.ศ. {rows[0].beYear})</td>
                    </tr>
                    {rows.map((r) => (
                      <tr key={`${r.adYear}-${r.month}`}>
                        <td>{monthlyLabel(r)}</td>
                        <td>{formatSatangAsBaht(r.inflow)}</td>
                        <td>{formatSatangAsBaht(r.outflow)}</td>
                        <td>{formatSatangAsBaht(r.transferToAsset)}</td>
                        <td>{formatSatangAsBaht(r.debtPrincipal)}</td>
                        <td>{formatSatangAsBaht(r.debtInterest)}</td>
                        <td>{formatSatangAsBaht(r.netCashFlow)}</td>
                        <td>{formatSatangAsBaht(r.netWorthCumulative)}</td>
                      </tr>
                    ))}
                  </Fragment>
                ))}
                {annualDisplayRows.map((r: AnnualProjectionRow) => (
                  <tr key={`annual-${r.projectionYearIndex}`}>
                    <td>
                      ปีที่ {r.projectionYearIndex} (พ.ศ. {r.beYear})
                    </td>
                    <td>{formatSatangAsBaht(r.inflow)}</td>
                    <td>{formatSatangAsBaht(r.outflow)}</td>
                    <td>{formatSatangAsBaht(r.transferToAsset)}</td>
                    <td>{formatSatangAsBaht(r.debtPrincipal)}</td>
                    <td>{formatSatangAsBaht(r.debtInterest)}</td>
                    <td>{formatSatangAsBaht(r.netCashFlow)}</td>
                    <td>{formatSatangAsBaht(r.netWorthEnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
