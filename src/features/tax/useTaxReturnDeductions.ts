import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import type { DeductionEntries } from './types'

// ยอดลดหย่อนจริงที่ผู้ใช้กรอกต่อรายการ (item_key -> สตางค์) — เพดาน/สูตรคำนวณอยู่ที่ taxCalculations.ts ไม่ใช่ที่นี่
export function useTaxReturnDeductions(taxYear: number | null) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<DeductionEntries>({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user || !taxYear) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('tax_return_deductions')
      .select('item_key, amount_satang')
      .eq('user_id', user.id)
      .eq('tax_year', taxYear)

    const map: DeductionEntries = {}
    for (const row of data ?? []) map[row.item_key] = row.amount_satang
    setEntries(map)
    setLoading(false)
  }, [user, taxYear])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveItem = useCallback(
    async (itemKey: string, amountSatang: number) => {
      if (!user || !taxYear) return { error: 'ไม่พบผู้ใช้หรือปีภาษี' }
      const { error } = await supabase
        .from('tax_return_deductions')
        .upsert(
          { user_id: user.id, tax_year: taxYear, item_key: itemKey, amount_satang: amountSatang },
          { onConflict: 'user_id,tax_year,item_key' },
        )
      if (!error) setEntries((prev) => ({ ...prev, [itemKey]: amountSatang }))
      return { error: error?.message ?? null }
    },
    [user, taxYear],
  )

  return { entries, loading, saveItem }
}
