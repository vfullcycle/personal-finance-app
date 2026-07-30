import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { BudgetItem } from './types'

export type BudgetItemRow = BudgetItem & { accountName: string }

// รายการงบประมาณ (รวมชั้น A+B เดิม) — join ชื่อบัญชีมาแสดงผล (name ของรายการเองเป็น optional, ไม่กรอกไว้ก็ fallback ไปใช้ชื่อบัญชี)
export function useBudgetItems() {
  const [items, setItems] = useState<BudgetItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase.from('budget_items').select('*, accounts(name)').order('start_date')

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    setItems((data ?? []).map(({ accounts, ...item }) => ({ ...item, accountName: accounts?.name ?? '' })))
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, loading, error, refresh }
}
