import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { BudgetScheduleItem } from './types'

export type BudgetScheduleRow = BudgetScheduleItem & { accountName: string }

// รายการแผนกำหนดการ (ชั้น B) — join ชื่อบัญชีมาแสดงผล เรียงตามปีเริ่มก่อน
export function useBudgetSchedule() {
  const [items, setItems] = useState<BudgetScheduleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('budget_schedule_items')
      .select('*, accounts(name)')
      .order('year_start')

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
