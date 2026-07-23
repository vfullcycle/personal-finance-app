import { useState } from 'react'
import { formatSatangAsBaht } from '../../lib/money'
import { todayLocalDateString } from '../../lib/date'
import { getCompareRange, getRange, type CompareMode, type PeriodType } from './period'
import { PeriodPicker } from './PeriodPicker'
import { IncomeStatementReport } from './IncomeStatementReport'
import { CashFlowReport } from './CashFlowReport'
import { BalanceSheetReport } from './BalanceSheetReport'
import { NetWorthChart } from './NetWorthChart'
import { useBalancesAsOf } from './useBalancesAsOf'
import { useReportLegs } from './useReportLegs'
import { buildBalanceSheet, buildCashFlowStatement } from './reportCalculations'

type ReportTab = 'income' | 'cashflow' | 'balance' | 'networth'

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'income', label: 'รายได้-ค่าใช้จ่าย' },
  { id: 'cashflow', label: 'กระแสเงินสด' },
  { id: 'balance', label: 'งบดุล' },
  { id: 'networth', label: 'แนวโน้ม' },
]

function SummaryCard() {
  const today = todayLocalDateString()
  const { rows } = useBalancesAsOf(today)
  const thisMonth = getRange(new Date(), 'month')
  const { legs } = useReportLegs(thisMonth)

  const netWorth = buildBalanceSheet(rows).netWorth
  const cf = buildCashFlowStatement(legs)

  return (
    <div className="report-summary-grid">
      <div className="report-summary-tile">
        <div className="report-summary-label">Net worth ปัจจุบัน</div>
        <div className={`report-summary-value${netWorth < 0 ? ' negative' : ''}`}>{formatSatangAsBaht(netWorth)} บาท</div>
      </div>
      <div className="report-summary-tile">
        <div className="report-summary-label">กระแสเงินสดสุทธิเดือนนี้</div>
        <div className={`report-summary-value${cf.netCashFlow < 0 ? ' negative' : ''}`}>{formatSatangAsBaht(cf.netCashFlow)} บาท</div>
      </div>
      <div className="report-summary-tile">
        <div className="report-summary-label">กำไรสุทธิเดือนนี้</div>
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

      <SummaryCard />

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

      {activeTab !== 'networth' && (
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
    </div>
  )
}
