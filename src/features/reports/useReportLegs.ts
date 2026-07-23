import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ReportLeg } from './reportCalculations'

type RawRow = {
  transaction_legs: {
    amount: number
    accounts: { id: string; name: string; type_id: string; subtype: string | null; cashflow_class: string | null }
  }[]
}

// ดึง legs ทุกตัวในช่วงวันที่ (join ผ่าน transactions.occurred_on แบบเดียวกับ useTransactions)
// range = null หมายถึงไม่ต้องดึง (เช่น ปิดโหมดเทียบช่วง)
export function useReportLegs(range: { from: string; to: string } | null) {
  const [legs, setLegs] = useState<ReportLeg[]>([])
  const [loading, setLoading] = useState(!!range)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!range) {
      setLegs([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .from('transactions')
      .select('transaction_legs(amount, accounts(id, name, type_id, subtype, cashflow_class))')
      .gte('occurred_on', range.from)
      .lte('occurred_on', range.to)
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
          setLoading(false)
          return
        }
        const rows = (data ?? []) as unknown as RawRow[]
        setLegs(
          rows.flatMap((r) =>
            r.transaction_legs.map((l) => ({ amount: l.amount, account: l.accounts })),
          ),
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.from, range?.to])

  return { legs, loading, error }
}
