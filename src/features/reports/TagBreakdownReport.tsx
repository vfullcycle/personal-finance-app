import { useState } from 'react'
import { formatSatangAsBaht } from '../../lib/money'
import { useTags } from '../transactions/useTags'
import { getRange, shiftAnchor, type PeriodType } from './period'
import { useReportLegs } from './useReportLegs'
import { buildIncomeStatement } from './reportCalculations'

const PERIOD_TYPES: { id: PeriodType; label: string }[] = [
  { id: 'month', label: 'รายเดือน' },
  { id: 'year', label: 'รายปี' },
]

// สรุปยอดรายได้-ค่าใช้จ่ายข้ามหมวดหมู่ ของธุรกรรมที่ติดแท็กที่เลือก ในช่วงเวลาที่เลือก (ไม่มีโหมดเทียบช่วง — ไม่จำเป็นสำหรับมุมมองนี้)
export function TagBreakdownReport() {
  const { tags, loading: tagsLoading } = useTags()
  const [tagId, setTagId] = useState('')
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [anchor, setAnchor] = useState(() => new Date())

  const range = getRange(anchor, periodType)
  const { legs, loading, error } = useReportLegs(tagId ? range : null, tagId || undefined)
  const statement = buildIncomeStatement(legs)
  const hasRows = statement.incomeRows.length > 0 || statement.expenseRows.length > 0

  if (!tagsLoading && tags.length === 0) {
    return <div className="empty-state">ยังไม่มีแท็ก — ไปเพิ่มแท็กที่หน้าตั้งค่า → แท็ก/มิติ ก่อน</div>
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="tagSelect">เลือกแท็ก</label>
        <select id="tagSelect" value={tagId} onChange={(e) => setTagId(e.target.value)}>
          <option value="" disabled>
            เลือกแท็ก
          </option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {tagId && (
        <>
          <div className="tabs">
            {PERIOD_TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`tab${periodType === t.id ? ' active' : ''}`}
                onClick={() => setPeriodType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="list-header">
            <button type="button" className="btn-secondary btn" aria-label="ช่วงก่อนหน้า" onClick={() => setAnchor(shiftAnchor(anchor, periodType, -1))}>
              ‹
            </button>
            <div style={{ fontWeight: 700 }}>{range.label}</div>
            <button type="button" className="btn-secondary btn" aria-label="ช่วงถัดไป" onClick={() => setAnchor(shiftAnchor(anchor, periodType, 1))}>
              ›
            </button>
          </div>

          {loading && <div className="empty-state">กำลังโหลด...</div>}
          {error && <div className="banner-error">{error}</div>}

          {!loading && !error && !hasRows && <div className="empty-state">ไม่มีรายการที่ติดแท็กนี้ในช่วงเวลาที่เลือก</div>}

          {!loading && !error && hasRows && (
            <>
              {statement.incomeRows.length > 0 && (
                <>
                  <div className="group-title">รายได้</div>
                  <div className="card">
                    {statement.incomeRows.map((r) => (
                      <div key={r.accountId} className="report-row">
                        <div className="report-row-name">{r.name}</div>
                        <span className="report-row-amount">{formatSatangAsBaht(r.amount)} บาท</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {statement.expenseRows.length > 0 && (
                <>
                  <div className="group-title">ค่าใช้จ่าย</div>
                  <div className="card">
                    {statement.expenseRows.map((r) => (
                      <div key={r.accountId} className="report-row">
                        <div className="report-row-name">{r.name}</div>
                        <span className="report-row-amount">{formatSatangAsBaht(r.amount)} บาท</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className={`report-net-card${statement.netIncome < 0 ? ' negative' : ''}`}>
                <span>สุทธิ</span>
                <span className="report-row-amount">{formatSatangAsBaht(statement.netIncome)} บาท</span>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
