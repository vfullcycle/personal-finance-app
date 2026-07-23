import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database'
import { detectRecurringFlow } from './types'

export { detectRecurringFlow }

export type RecurringLegDetail = Tables<'recurring_transaction_legs'> & { account: Tables<'accounts'> }
export type RecurringDetail = Tables<'recurring_transactions'> & { legs: RecurringLegDetail[] }

type RawRow = Tables<'recurring_transactions'> & {
  recurring_transaction_legs: (Tables<'recurring_transaction_legs'> & { accounts: Tables<'accounts'> })[]
}

export function useRecurring() {
  const [items, setItems] = useState<RecurringDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('recurring_transactions')
      .select('*, recurring_transaction_legs(*, accounts(*))')
      .order('next_due_date')

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows = (data ?? []) as unknown as RawRow[]
    setItems(
      rows.map((r) => ({
        ...r,
        legs: r.recurring_transaction_legs.map((l) => ({ ...l, account: l.accounts })),
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { items, loading, error, refresh }
}

export async function deleteRecurring(id: string) {
  return supabase.from('recurring_transactions').delete().eq('id', id)
}

export async function setRecurringActive(id: string, isActive: boolean) {
  return supabase.from('recurring_transactions').update({ is_active: isActive }).eq('id', id)
}
