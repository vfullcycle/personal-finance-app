import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database'
import type { AccountType } from './constants'

export type AccountRow = Tables<'accounts'> & { balance: number }

export function useAccounts(typeIds: AccountType[]) {
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const [{ data: accountRows, error: accountsError }, { data: balanceRows, error: balancesError }] =
      await Promise.all([
        supabase.from('accounts').select('*').in('type_id', typeIds).order('created_at'),
        supabase.from('v_account_balances').select('account_id, balance'),
      ])

    if (accountsError) {
      setError(accountsError.message)
      setLoading(false)
      return
    }
    if (balancesError) {
      setError(balancesError.message)
      setLoading(false)
      return
    }

    const balanceByAccountId = new Map((balanceRows ?? []).map((b) => [b.account_id, b.balance ?? 0]))
    setAccounts(
      (accountRows ?? []).map((a) => ({ ...a, balance: balanceByAccountId.get(a.id) ?? a.opening_balance })),
    )
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeIds.join(',')])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { accounts, loading, error, refresh }
}
