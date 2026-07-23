import { formatSatangAsBaht } from '../../lib/money'
import { ASSET_SUBTYPE_LABEL, LIABILITY_SUBTYPE_LABEL } from '../accounts/constants'
import type { DateRange } from './period'
import { useBalancesAsOf } from './useBalancesAsOf'
import { buildBalanceSheet, type BalanceSheetAccountRow } from './reportCalculations'
import { DeltaChip } from './DeltaChip'

function groupBySubtype(rows: BalanceSheetAccountRow[], order: string[], labelOf: (s: string) => string) {
  const groups = new Map<string, BalanceSheetAccountRow[]>()
  for (const r of rows) {
    const key = r.subtype ?? 'other'
    const list = groups.get(key) ?? []
    list.push(r)
    groups.set(key, list)
  }
  return order
    .filter((key) => groups.has(key))
    .map((key) => ({ key, label: labelOf(key), rows: groups.get(key)! }))
}

function Section({
  title,
  rows,
  total,
  compareTotal,
  compareByAccount,
  subtypeOrder,
  labelOf,
  showCompare,
  goodDirection,
}: {
  title: string
  rows: BalanceSheetAccountRow[]
  total: number
  compareTotal: number
  compareByAccount: Map<string, number>
  subtypeOrder: string[]
  labelOf: (s: string) => string
  showCompare: boolean
  goodDirection: 'up' | 'down'
}) {
  if (rows.length === 0) return null
  const groups = groupBySubtype(rows, [...subtypeOrder, 'other'], labelOf)

  return (
    <>
      <div className="group-title">{title}</div>
      {groups.map((g) => (
        <div key={g.key} style={{ marginBottom: 12 }}>
          <div className="report-subgroup-title">{g.label}</div>
          <div className="card">
            {g.rows.map((r) => (
              <div key={r.accountId} className="report-row">
                <div className="report-row-name">{r.name}</div>
                <div className="report-row-values">
                  <span className={`report-row-amount${r.balance < 0 ? ' negative' : ''}`}>
                    {formatSatangAsBaht(r.balance)} บาท
                  </span>
                  {showCompare && (
                    <DeltaChip current={r.balance} previous={compareByAccount.get(r.accountId) ?? 0} goodDirection={goodDirection} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="report-total-row">
        <span>รวม{title}</span>
        <span className="report-row-values">
          <span className="report-row-amount">{formatSatangAsBaht(total)} บาท</span>
          {showCompare && <DeltaChip current={total} previous={compareTotal} goodDirection={goodDirection} />}
        </span>
      </div>
    </>
  )
}

export function BalanceSheetReport({ range, compareRange }: { range: DateRange; compareRange: DateRange | null }) {
  const { rows, loading, error } = useBalancesAsOf(range.asOf)
  const { rows: compareRows, loading: compareLoading } = useBalancesAsOf(compareRange?.asOf ?? null)
  const showCompare = !!compareRange

  const sheet = buildBalanceSheet(rows)
  const compareSheet = compareRange ? buildBalanceSheet(compareRows) : null

  if (loading || (showCompare && compareLoading)) return <div className="empty-state">กำลังโหลด...</div>
  if (error) return <div className="banner-error">{error}</div>

  if (sheet.assets.length === 0 && sheet.liabilities.length === 0) {
    return <div className="empty-state">ยังไม่มีบัญชีสินทรัพย์/หนี้สิน</div>
  }

  const assetCompareMap = new Map(sheet.assets.map((r) => [r.accountId, compareSheet?.assets.find((c) => c.accountId === r.accountId)?.balance ?? 0]))
  const liabilityCompareMap = new Map(
    sheet.liabilities.map((r) => [r.accountId, compareSheet?.liabilities.find((c) => c.accountId === r.accountId)?.balance ?? 0]),
  )

  return (
    <div>
      <Section
        title="สินทรัพย์"
        rows={sheet.assets}
        total={sheet.totalAssets}
        compareTotal={compareSheet?.totalAssets ?? 0}
        compareByAccount={assetCompareMap}
        subtypeOrder={Object.keys(ASSET_SUBTYPE_LABEL)}
        labelOf={(s) => (ASSET_SUBTYPE_LABEL as Record<string, string>)[s] ?? 'อื่นๆ'}
        showCompare={showCompare}
        goodDirection="up"
      />
      <Section
        title="หนี้สิน"
        rows={sheet.liabilities}
        total={sheet.totalLiabilities}
        compareTotal={compareSheet?.totalLiabilities ?? 0}
        compareByAccount={liabilityCompareMap}
        subtypeOrder={Object.keys(LIABILITY_SUBTYPE_LABEL)}
        labelOf={(s) => (LIABILITY_SUBTYPE_LABEL as Record<string, string>)[s] ?? 'อื่นๆ'}
        showCompare={showCompare}
        goodDirection="down"
      />

      <div className={`report-net-card${sheet.netWorth < 0 ? ' negative' : ''}`}>
        <span>ความมั่งคั่งสุทธิ (Net Worth)</span>
        <span className="report-row-values">
          <span className="report-row-amount">{formatSatangAsBaht(sheet.netWorth)} บาท</span>
          {showCompare && compareSheet && <DeltaChip current={sheet.netWorth} previous={compareSheet.netWorth} goodDirection="up" />}
        </span>
      </div>
    </div>
  )
}
