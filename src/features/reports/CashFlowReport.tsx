import { formatSatangAsBaht } from '../../lib/money'
import type { DateRange } from './period'
import { useReportLegs } from './useReportLegs'
import { buildCashFlowStatement, type CashFlowStatement } from './reportCalculations'
import { DeltaChip } from './DeltaChip'

function Line({
  label,
  amount,
  compareAmount,
  goodDirection,
  showCompare,
  hideIfZero,
}: {
  label: string
  amount: number
  compareAmount: number
  goodDirection: 'up' | 'down'
  showCompare: boolean
  hideIfZero?: boolean
}) {
  if (hideIfZero && amount === 0 && (!showCompare || compareAmount === 0)) return null
  return (
    <div className="report-row">
      <div className="report-row-name">{label}</div>
      <div className="report-row-values">
        <span className="report-row-amount">{formatSatangAsBaht(amount)} บาท</span>
        {showCompare && <DeltaChip current={amount} previous={compareAmount} goodDirection={goodDirection} />}
      </div>
    </div>
  )
}

const EMPTY_CF: CashFlowStatement = {
  totalIncome: 0,
  fixedExpense: 0,
  variableExpense: 0,
  uncategorizedExpense: 0,
  savingsOutflow: 0,
  savingsWithdrawal: 0,
  principalRepayment: 0,
  newLoanProceeds: 0,
  netIncome: 0,
  netCashFlow: 0,
  diffFromNetIncome: 0,
}

export function CashFlowReport({ range, compareRange }: { range: DateRange; compareRange: DateRange | null }) {
  const { legs, loading, error } = useReportLegs(range)
  const { legs: compareLegs, loading: compareLoading } = useReportLegs(compareRange)

  const cf = buildCashFlowStatement(legs)
  const compareCf = compareRange ? buildCashFlowStatement(compareLegs) : EMPTY_CF
  const showCompare = !!compareRange

  if (loading || (showCompare && compareLoading)) return <div className="empty-state">กำลังโหลด...</div>
  if (error) return <div className="banner-error">{error}</div>

  if (
    cf.totalIncome === 0 &&
    cf.fixedExpense === 0 &&
    cf.variableExpense === 0 &&
    cf.uncategorizedExpense === 0 &&
    cf.savingsOutflow === 0 &&
    cf.savingsWithdrawal === 0 &&
    cf.principalRepayment === 0 &&
    cf.newLoanProceeds === 0
  ) {
    return <div className="empty-state">ยังไม่มีรายการในช่วงนี้</div>
  }

  return (
    <div>
      <div className="card">
        <Line label="รายรับ" amount={cf.totalIncome} compareAmount={compareCf.totalIncome} goodDirection="up" showCompare={showCompare} />
        <Line
          label="(หัก) รายจ่ายคงที่"
          amount={cf.fixedExpense}
          compareAmount={compareCf.fixedExpense}
          goodDirection="down"
          showCompare={showCompare}
        />
        <Line
          label="(หัก) รายจ่ายแปรผัน"
          amount={cf.variableExpense}
          compareAmount={compareCf.variableExpense}
          goodDirection="down"
          showCompare={showCompare}
        />
        <Line
          label="(หัก) รายจ่ายไม่ระบุถัง"
          amount={cf.uncategorizedExpense}
          compareAmount={compareCf.uncategorizedExpense}
          goodDirection="down"
          showCompare={showCompare}
          hideIfZero
        />
        <Line
          label="(หัก) เงินออม/ลงทุน"
          amount={cf.savingsOutflow}
          compareAmount={compareCf.savingsOutflow}
          goodDirection="up"
          showCompare={showCompare}
          hideIfZero
        />
        <Line
          label="(บวก) ถอนเงินออม/ลงทุน"
          amount={cf.savingsWithdrawal}
          compareAmount={compareCf.savingsWithdrawal}
          goodDirection="down"
          showCompare={showCompare}
          hideIfZero
        />
        <Line
          label="(หัก) เงินต้นผ่อนหนี้"
          amount={cf.principalRepayment}
          compareAmount={compareCf.principalRepayment}
          goodDirection="down"
          showCompare={showCompare}
          hideIfZero
        />
        <Line
          label="(บวก) เงินกู้ใหม่ที่รับเข้ามา"
          amount={cf.newLoanProceeds}
          compareAmount={compareCf.newLoanProceeds}
          goodDirection="down"
          showCompare={showCompare}
          hideIfZero
        />
      </div>

      <div className={`report-net-card${cf.netCashFlow < 0 ? ' negative' : ''}`}>
        <span>กระแสเงินสดสุทธิ</span>
        <span className="report-row-values">
          <span className="report-row-amount">{formatSatangAsBaht(cf.netCashFlow)} บาท</span>
          {showCompare && <DeltaChip current={cf.netCashFlow} previous={compareCf.netCashFlow} goodDirection="up" />}
        </span>
      </div>

      {cf.diffFromNetIncome !== 0 && (
        <div className="banner-info" style={{ marginTop: 12 }}>
          ต่างจากรายได้สุทธิในงบรายได้-ค่าใช้จ่าย ({formatSatangAsBaht(cf.netIncome)} บาท) อยู่ {formatSatangAsBaht(cf.diffFromNetIncome)} บาท
          — ส่วนต่างคือ (เงินออม/ลงทุน + เงินต้นผ่อนหนี้) หัก (เงินถอนออม/ลงทุน + เงินกู้ใหม่ที่รับเข้ามา) ที่ไม่ใช่ expense แต่เป็นเงินสดที่ไหลออก/เข้าจริง
        </div>
      )}
    </div>
  )
}
