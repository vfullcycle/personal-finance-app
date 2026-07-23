import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type BalanceAsOfRow = {
  account_id: string
  user_id: string
  name: string
  type_id: string
  subtype: string | null
  asset_liquidity: string | null
  is_invested: boolean
  term: string | null
  is_mortgage: boolean
  balance: number
}

// ยอดคงเหลือแต่ละบัญชี ณ วันที่กำหนด (fn_account_balances_as_of) — ใช้สำหรับงบดุลที่ต้องเทียบช่วง
// as_of = null หมายถึงไม่ต้องดึง
export function useBalancesAsOf(asOf: string | null) {
  const [rows, setRows] = useState<BalanceAsOfRow[]>([])
  const [loading, setLoading] = useState(!!asOf)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!asOf) {
      setRows([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .rpc('fn_account_balances_as_of', { as_of: asOf })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
          setLoading(false)
          return
        }
        setRows((data ?? []) as BalanceAsOfRow[])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [asOf])

  return { rows, loading, error }
}
