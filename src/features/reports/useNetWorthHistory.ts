import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export type NetWorthPoint = {
  as_of: string
  total_assets: number
  total_liabilities: number
  net_worth: number
}

// แนวโน้ม net worth สิ้นแต่ละเดือนย้อนหลัง (fn_net_worth_history)
export function useNetWorthHistory(monthCount: number) {
  const [points, setPoints] = useState<NetWorthPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    supabase
      .rpc('fn_net_worth_history', { month_count: monthCount })
      .then(({ data, error: fetchError }) => {
        if (cancelled) return
        if (fetchError) {
          setError(fetchError.message)
          setLoading(false)
          return
        }
        setPoints((data ?? []) as NetWorthPoint[])
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [monthCount])

  return { points, loading, error }
}
