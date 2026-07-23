import { formatSatangAsBaht } from '../../lib/money'
import type { DateRange } from './period'
import { useReportLegs } from './useReportLegs'
import { buildIncomeStatement, type CategoryRow } from './reportCalculations'
import { DeltaChip } from './DeltaChip'

function CategoryList({
  rows,
  compareByAccount,
  total,
  goodDirection,
  showCompare,
}: {
  rows: CategoryRow[]
  compareByAccount: Map<string, number>
  total: number
  goodDirection: 'up' | 'down'
  showCompare: boolean
}) {
  return (
    <div className="card">
      {rows.map((r) => {
        const pct = total !== 0 ? (r.amount / total) * 100 : 0
        return (
          <div key={r.accountId} className="report-row">
            <div className="report-row-name">
              {r.name}
              <span className="report-row-pct">{pct.toFixed(0)}%</span>
            </div>
            <div className="report-row-values">
              <span className="report-row-amount">{formatSatangAsBaht(r.amount)} บาท</span>
              {showCompare && (
                <DeltaChip current={r.amount} previous={compareByAccount.get(r.accountId) ?? 0} goodDirection={goodDirection} />
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function IncomeStatementReport({ range, compareRange }: { range: DateRange; compareRange: DateRange | null }) {
  const { legs, loading, error } = useReportLegs(range)
  const { legs: compareLegs, loading: compareLoading } = useReportLegs(compareRange)

  const statement = buildIncomeStatement(legs)
  const compareStatement = compareRange ? buildIncomeStatement(compareLegs) : null
  const showCompare = !!compareRange

  const incomeByAccount = new Map((compareStatement?.incomeRows ?? []).map((r) => [r.accountId, r.amount]))
  const expenseByAccount = new Map((compareStatement?.expenseRows ?? []).map((r) => [r.accountId, r.amount]))

  if (loading || (showCompare && compareLoading)) return <div className="empty-state">กำลังโหลด...</div>
  if (error) return <div className="banner-error">{error}</div>

  if (statement.incomeRows.length === 0 && statement.expenseRows.length === 0) {
    return <div className="empty-state">ยังไม่มีรายการในช่วงนี้</div>
  }

  return (
    <div>
      <div className="group-title">รายได้</div>
      {statement.incomeRows.length === 0 ? (
        <div className="empty-state">ไม่มีรายได้ในช่วงนี้</div>
      ) : (
        <CategoryList
          rows={statement.incomeRows}
          compareByAccount={incomeByAccount}
          total={statement.totalIncome}
          goodDirection="up"
          showCompare={showCompare}
        />
      )}
      <div className="report-total-row">
        <span>รวมรายได้</span>
        <span className="report-row-values">
          <span className="report-row-amount">{formatSatangAsBaht(statement.totalIncome)} บาท</span>
          {showCompare && compareStatement && (
            <DeltaChip current={statement.totalIncome} previous={compareStatement.totalIncome} goodDirection="up" />
          )}
        </span>
      </div>

      <div className="group-title">ค่าใช้จ่าย</div>
      {statement.expenseRows.length === 0 ? (
        <div className="empty-state">ไม่มีค่าใช้จ่ายในช่วงนี้</div>
      ) : (
        <CategoryList
          rows={statement.expenseRows}
          compareByAccount={expenseByAccount}
          total={statement.totalExpense}
          goodDirection="down"
          showCompare={showCompare}
        />
      )}
      <div className="report-total-row">
        <span>รวมค่าใช้จ่าย</span>
        <span className="report-row-values">
          <span className="report-row-amount">{formatSatangAsBaht(statement.totalExpense)} บาท</span>
          {showCompare && compareStatement && (
            <DeltaChip current={statement.totalExpense} previous={compareStatement.totalExpense} goodDirection="down" />
          )}
        </span>
      </div>

      <div className={`report-net-card${statement.netIncome < 0 ? ' negative' : ''}`}>
        <span>รายได้สุทธิ</span>
        <span className="report-row-values">
          <span className="report-row-amount">{formatSatangAsBaht(statement.netIncome)} บาท</span>
          {showCompare && compareStatement && (
            <DeltaChip current={statement.netIncome} previous={compareStatement.netIncome} goodDirection="up" />
          )}
        </span>
      </div>
    </div>
  )
}
