import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { IncomeType } from '../accounts/constants'
import type { IncomeByType } from './types'

type RawRow = {
  transaction_legs: { amount: number; accounts: { taxable: boolean; income_type: string | null } | null }[]
}

// เงินได้ตาม 40(1)-(8) ดึงจาก ledger อัตโนมัติ (บัญชี income ที่ taxable=true เท่านั้น) ตาม flow ใน REQUIREMENTS §6
// legs ของบัญชี income เป็น credit (ลบ) เสมอ ตาม §3.4 — -amount = เงินได้ที่รับจริง
// tax_year เป็น พ.ศ. — occurred_on เก็บเป็น ค.ศ. ต้องแปลง (ค.ศ. = พ.ศ. − 543) ก่อน query
export function useTaxableIncome(taxYear: number | null) {
  const [incomeByType, setIncomeByType] = useState<IncomeByType>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!taxYear) {
      setIncomeByType({})
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    const gregorianYear = taxYear - 543
    const from = `${gregorianYear}-01-01`
    const to = `${gregorianYear}-12-31`

    supabase
      .from('transactions')
      .select('transaction_legs(amount, accounts(taxable, income_type))')
      .gte('occurred_on', from)
      .lte('occurred_on', to)
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
          setLoading(false)
          return
        }

        const rows = (data ?? []) as unknown as RawRow[]
        const totals: IncomeByType = {}
        for (const row of rows) {
          for (const leg of row.transaction_legs) {
            const acc = leg.accounts
            if (!acc?.taxable || !acc.income_type) continue
            const type = acc.income_type as IncomeType
            totals[type] = (totals[type] ?? 0) + -leg.amount
          }
        }
        setIncomeByType(totals)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [taxYear])

  return { incomeByType, loading, error }
}
