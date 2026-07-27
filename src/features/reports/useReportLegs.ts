import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { ReportLeg } from './reportCalculations'

type RawRow = {
  id: string
  occurred_on: string
  transaction_legs: {
    amount: number
    accounts: {
      id: string
      name: string
      type_id: string
      subtype: string | null
      cashflow_class: string | null
      is_mortgage: boolean
      taxable: boolean
      income_type: string | null
    }
  }[]
}

// ดึง legs ทุกตัวในช่วงวันที่ (join ผ่าน transactions.occurred_on แบบเดียวกับ useTransactions)
// range = null หมายถึงไม่ต้องดึง (เช่น ปิดโหมดเทียบช่วง)
// tagId (optional) = กรองเฉพาะธุรกรรมที่ผูกแท็กนี้ (inner join ผ่าน transaction_tags) — ใช้กับ "สรุปตามแท็ก"
export function useReportLegs(range: { from: string; to: string } | null, tagId?: string | null) {
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

    const columns = tagId
      ? 'id, occurred_on, transaction_legs(amount, accounts(id, name, type_id, subtype, cashflow_class, is_mortgage, taxable, income_type)), transaction_tags!inner(tag_id)'
      : 'id, occurred_on, transaction_legs(amount, accounts(id, name, type_id, subtype, cashflow_class, is_mortgage, taxable, income_type))'

    let query = supabase.from('transactions').select(columns).gte('occurred_on', range.from).lte('occurred_on', range.to)
    if (tagId) query = query.eq('transaction_tags.tag_id', tagId)

    query.then(({ data, error: fetchError }) => {
      if (cancelled) return
      if (fetchError) {
        setError(fetchError.message)
        setLoading(false)
        return
      }
      const rows = (data ?? []) as unknown as RawRow[]
      setLegs(
        rows.flatMap((r) =>
          r.transaction_legs.map((l) => ({ amount: l.amount, transactionId: r.id, occurredOn: r.occurred_on, account: l.accounts })),
        ),
      )
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.from, range?.to, tagId])

  return { legs, loading, error }
}
