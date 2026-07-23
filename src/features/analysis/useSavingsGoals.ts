import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database'

export type SavingsGoalRow = Tables<'savings_goals'> & { accountName: string; currentBalance: number }

// เป้าหมายการออมผูกกับบัญชีสินทรัพย์จริง — ความคืบหน้าอ่านจากยอดคงเหลือปัจจุบัน (v_account_balances) ไม่เก็บ "ออมแล้วเท่าไหร่" แยก
export function useSavingsGoals() {
  const [goals, setGoals] = useState<SavingsGoalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [{ data: goalRows, error: goalsError }, { data: balanceRows, error: balancesError }] = await Promise.all([
      supabase.from('savings_goals').select('*, accounts(name)').order('created_at'),
      supabase.from('v_account_balances').select('account_id, balance'),
    ])

    if (goalsError) {
      setError(goalsError.message)
      setLoading(false)
      return
    }
    if (balancesError) {
      setError(balancesError.message)
      setLoading(false)
      return
    }

    const balanceByAccountId = new Map((balanceRows ?? []).map((b) => [b.account_id, b.balance ?? 0]))
    setGoals(
      (goalRows ?? []).map(({ accounts, ...g }) => ({
        ...g,
        accountName: accounts?.name ?? '',
        currentBalance: balanceByAccountId.get(g.account_id) ?? 0,
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { goals, loading, error, refresh }
}
