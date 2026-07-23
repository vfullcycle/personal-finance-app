import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database'
import { detectFlow } from './types'
import { onTransactionsChanged } from './events'

export { detectFlow }

export type TransactionLegDetail = Tables<'transaction_legs'> & { account: Tables<'accounts'> }
export type TransactionDetail = Tables<'transactions'> & {
  legs: TransactionLegDetail[]
  tagIds: string[]
  tagNames: string[]
}

type RawRow = Tables<'transactions'> & {
  transaction_legs: (Tables<'transaction_legs'> & { accounts: Tables<'accounts'> })[]
  transaction_tags: { tag_id: string; tags: { name: string } | null }[]
}

export function useTransactions(range: { from: string; to: string }) {
  const [transactions, setTransactions] = useState<TransactionDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('transactions')
      .select('*, transaction_legs(*, accounts(*)), transaction_tags(tag_id, tags(name))')
      .gte('occurred_on', range.from)
      .lte('occurred_on', range.to)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows = (data ?? []) as unknown as RawRow[]
    setTransactions(
      rows.map((r) => ({
        ...r,
        legs: r.transaction_legs.map((l) => ({ ...l, account: l.accounts })),
        tagIds: r.transaction_tags.map((t) => t.tag_id),
        tagNames: r.transaction_tags.map((t) => t.tags?.name ?? '').filter(Boolean),
      })),
    )
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => onTransactionsChanged(refresh), [refresh])

  return { transactions, loading, error, refresh }
}

export async function deleteTransaction(id: string) {
  return supabase.from('transactions').delete().eq('id', id)
}
