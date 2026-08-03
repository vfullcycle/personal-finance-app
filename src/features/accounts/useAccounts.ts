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
        supabase.from('accounts').select('*').in('type_id', typeIds).order('sort_order'),
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

  // จัดเรียงลำดับใหม่เฉพาะกลุ่มพี่น้องที่กำลังลาก (orderedIds) — ไม่ renumber ทั้งตาราง
  // แค่สลับว่า sort_order ค่าเดิมของกลุ่มนี้ตกไปอยู่กับ id ไหนตามตำแหน่งใหม่
  const reorder = useCallback(async (orderedIds: string[]) => {
    setAccounts((prev) => {
      const byId = new Map(prev.map((a) => [a.id, a]))
      const sortOrders = orderedIds.map((id) => byId.get(id)?.sort_order ?? 0).sort((a, b) => a - b)
      const nextSortOrderById = new Map(orderedIds.map((id, i) => [id, sortOrders[i]]))
      const next = prev.map((a) => (nextSortOrderById.has(a.id) ? { ...a, sort_order: nextSortOrderById.get(a.id)! } : a))
      return [...next].sort((a, b) => a.sort_order - b.sort_order)
    })

    const current = accounts
    const byId = new Map(current.map((a) => [a.id, a]))
    const sortOrders = orderedIds.map((id) => byId.get(id)?.sort_order ?? 0).sort((a, b) => a - b)
    await Promise.all(
      orderedIds.map((id, i) => supabase.from('accounts').update({ sort_order: sortOrders[i] }).eq('id', id)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts])

  return { accounts, loading, error, refresh, reorder }
}
