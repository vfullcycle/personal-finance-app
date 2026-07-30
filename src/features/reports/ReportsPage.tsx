import { useState } from 'react'
import { formatSatangAsBaht } from '../../lib/money'
import { getCompareRange, getRange, type CompareMode, type DateRange, type PeriodType } from './period'
import { PeriodPicker } from './PeriodPicker'
import { IncomeStatementReport } from './IncomeStatementReport'
import { CashFlowReport } from './CashFlowReport'
import { BalanceSheetReport } from './BalanceSheetReport'
import { NetWorthChart } from './NetWorthChart'
import { TagBreakdownReport } from './TagBreakdownReport'
import { useBalancesAsOf } from './useBalancesAsOf'
import { useReportLegs } from './useReportLegs'
import { buildBalanceSheet, buildCashFlowStatement } from './reportCalculations'

type ReportTab = 'income' | 'cashflow' | 'balance' | 'networth' | 'tag'

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'income', label: 'รายได้-ค่าใช้จ่าย' },
  { id: 'cashflow', label: 'กระแสเงินสด' },
  { id: 'balance', label: 'งบดุล' },
  { id: 'networth', label: 'แนวโน้ม' },
  { id: 'tag', label: 'ตามแท็ก' },
]

// v1.3: การ์ดสรุปตามช่วงที่กำลังเลื่อนดูอยู่ (range/anchor เดียวกับแท็บด้านล่าง) แทนที่จะตรึงเดือนปฏิทินจริงเสมอ
// เดิมใช้ getRange(new Date(), 'month') คงที่ ทำให้เลื่อนดูเดือนอื่นด้านล่างแล้วตัวเลขบนการ์ดไม่ขยับตาม สับสนว่าทำไมไม่เปลี่ยน
function SummaryCard({ range }: { range: DateRange }) {
  const { rows } = useBalancesAsOf(range.asOf)
  const { legs } = useReportLegs(range)

  const netWorth = buildBalanceSheet(rows).netWorth
  const cf = buildCashFlowStatement(legs)

  return (
    <div className="report-summary-grid">
      <div className="report-summary-tile">
        <div className="report-summary-label">Net worth ณ {range.label}</div>
        <div className={`report-summary-value${netWorth < 0 ? ' negative' : ''}`}>{formatSatangAsBaht(netWorth)} บาท</div>
      </div>
      <div className="report-summary-tile">
        <div className="report-summary-label">กระแสเงินสดสุทธิ ({range.label})</div>
        <div className={`report-summary-value${cf.netCashFlow < 0 ? ' negative' : ''}`}>{formatSatangAsBaht(cf.netCashFlow)} บาท</div>
      </div>
      <div className="report-summary-tile">
        <div className="report-summary-label">กำไรสุทธิ ({range.label})</div>
        <div className={`report-summary-value${cf.netIncome < 0 ? ' negative' : ''}`}>{formatSatangAsBaht(cf.netIncome)} บาท</div>
      </div>
    </div>
  )
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('income')
  const [periodType, setPeriodType] = useState<PeriodType>('month')
  const [anchor, setAnchor] = useState(() => new Date())
  const [compareMode, setCompareMode] = useState<CompareMode>('previous')

  const range = getRange(anchor, periodType)
  const compareRange = getCompareRange(anchor, periodType, compareMode)

  return (
    <div className="page">
      <div className="list-header">
        <h1>รายงาน</h1>
      </div>

      <SummaryCard range={range} />

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab !== 'networth' && activeTab !== 'tag' && (
        <PeriodPicker
          periodType={periodType}
          anchor={anchor}
          compareMode={compareMode}
          onPeriodTypeChange={setPeriodType}
          onAnchorChange={setAnchor}
          onCompareModeChange={setCompareMode}
        />
      )}

      {activeTab === 'income' && <IncomeStatementReport range={range} compareRange={compareRange} />}
      {activeTab === 'cashflow' && <CashFlowReport range={range} compareRange={compareRange} />}
      {activeTab === 'balance' && <BalanceSheetReport range={range} compareRange={compareRange} />}
      {activeTab === 'networth' && <NetWorthChart />}
      {activeTab === 'tag' && <TagBreakdownReport />}
    </div>
  )
}
