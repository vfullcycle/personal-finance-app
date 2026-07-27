import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { BudgetBaselineItem } from './types'

export type BudgetBaselineRow = BudgetBaselineItem & { accountName: string; accountTypeId: string }

// รายการงบประจำ (ชั้น A) — join ชื่อ/ประเภทบัญชีมาแสดงผล ไม่เก็บ direction แยก (derive จาก accountTypeId ตอนแสดง/คำนวณ)
export function useBudgetBaseline() {
  const [items, setItems] = useState<BudgetBaselineRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('budget_baseline_items')
      .select('*, accounts(name, type_id)')
      .order('created_at')

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setItems(
      (data ?? []).map(({ accounts, ...item }) => ({
        ...item,
        accountName: accounts?.name ?? '',
        accountTypeId: accounts?.type_id ?? '',
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, loading, error, refresh }
}
