import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { todayLocalDateString } from '../../lib/date'
import { buildBalanceSheet } from '../reports/reportCalculations'
import { useBalancesAsOf } from '../reports/useBalancesAsOf'
import { useAllTaxConfigs } from '../tax/useAllTaxConfigs'
import { useAvailableTaxYears } from '../tax/useTaxConfig'
import { useTaxReturn } from '../tax/useTaxReturn'
import { useTaxReturnDeductions } from '../tax/useTaxReturnDeductions'
import type { DeductionEntries } from '../tax/types'
import {
  calculateProjection,
  type ProjectionAccountRef,
  type ProjectionItem,
  type ProjectionLoanAccountFields,
  type YearCutMode,
} from './projectionCalculations'

type RawItemRow = {
  direction: string
  frequency: string
  start_date: string
  end_date: string | null
  amount_per_occurrence_satang: number
  growth_percent_per_year: number
  is_active: boolean
  accounts: ProjectionAccountRef | null
}

// ดึงข้อมูลดิบทั้งหมดที่ projection ต้องใช้ (budget_items, บัญชีเงินกู้ที่ตั้งค่าครบ, net worth ปัจจุบัน, tax config ทุกปี,
// ค่าลดหย่อนที่ผู้ใช้ติ๊ก "ใช้ในงบประมาณ") แล้วเรียก calculateProjection (pure function) — แยกชั้น data fetching ออกจากชั้นคำนวณ
export function useProjection(params: { closingDateIso: string; totalYears: number; cutMode: YearCutMode }) {
  const { user } = useAuth()
  const { closingDateIso, totalYears, cutMode } = params

  const [items, setItems] = useState<ProjectionItem[]>([])
  const [loanAccounts, setLoanAccounts] = useState<ProjectionLoanAccountFields[]>([])
  const [rawLoading, setRawLoading] = useState(true)

  const today = todayLocalDateString()
  const { rows: balanceRows, loading: balancesLoading } = useBalancesAsOf(today)
  const startingNetWorth = useMemo(() => buildBalanceSheet(balanceRows).netWorth, [balanceRows])

  const { configs: taxConfigsByYear, loading: taxConfigsLoading } = useAllTaxConfigs()
  const availableTaxYears = useAvailableTaxYears()
  const latestTaxYear = availableTaxYears[0] ?? null
  const { header: deductionHeader, loading: headerLoading } = useTaxReturn(latestTaxYear)
  const { entries, projectionFlags, loading: entriesLoading } = useTaxReturnDeductions(latestTaxYear)

  // เฉพาะรายการที่ผู้ใช้ติ๊ก "ใช้ค่านี้ในงบประมาณด้วย" ในหน้า /tax แท็บค่าลดหย่อน (ดู DeductionsTab.tsx)
  const deductionEntries = useMemo(() => {
    const filtered: DeductionEntries = {}
    for (const [key, amount] of Object.entries(entries)) {
      if (projectionFlags[key]) filtered[key] = amount
    }
    return filtered
  }, [entries, projectionFlags])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setRawLoading(true)

    Promise.all([
      supabase
        .from('budget_items')
        .select('direction, frequency, start_date, end_date, amount_per_occurrence_satang, growth_percent_per_year, is_active, accounts(type_id, taxable, income_type)'),
      supabase
        .from('accounts')
        .select('loan_original_principal, loan_annual_rate, loan_term_months, loan_start_date, loan_interest_method')
        .eq('type_id', 'liability')
        .eq('subtype', 'loan'),
    ]).then(([itemsRes, loans]) => {
      if (cancelled) return

      setItems(
        ((itemsRes.data ?? []) as unknown as RawItemRow[])
          .filter((r) => r.accounts)
          .map((r) => ({
            direction: r.direction as ProjectionItem['direction'],
            frequency: r.frequency as ProjectionItem['frequency'],
            start_date: r.start_date,
            end_date: r.end_date,
            amount_per_occurrence_satang: r.amount_per_occurrence_satang,
            growth_percent_per_year: r.growth_percent_per_year,
            is_active: r.is_active,
            account: r.accounts!,
          })),
      )
      setLoanAccounts((loans.data ?? []) as ProjectionLoanAccountFields[])
      setRawLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [user])

  const loading = rawLoading || balancesLoading || taxConfigsLoading || headerLoading || entriesLoading

  const result = useMemo(() => {
    if (loading) return null
    return calculateProjection({
      closingDateIso,
      totalYears,
      cutMode,
      items,
      loanAccounts,
      startingNetWorthSatang: startingNetWorth,
      taxConfigsByYear,
      deductionHeader,
      deductionEntries,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, closingDateIso, totalYears, cutMode, items, loanAccounts, startingNetWorth, taxConfigsByYear])

  return { result, loading, startingNetWorth }
}
