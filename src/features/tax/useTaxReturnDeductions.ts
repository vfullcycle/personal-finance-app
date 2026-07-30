import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import type { DeductionEntries } from './types'

// ยอดลดหย่อนจริงที่ผู้ใช้กรอกต่อรายการ (item_key -> สตางค์) — เพดาน/สูตรคำนวณอยู่ที่ taxCalculations.ts ไม่ใช่ที่นี่
// use_in_projection (C7 ช่วง 2) — flag ต่อรายการแยกจากยอด: วีเลือกเองว่ารายการไหนใช้เป็นสมมติฐานค่าลดหย่อนในงบประมาณ/projection
// ต่อ (ไม่ใช่เหมาทุกช่องจากปีล่าสุดอัตโนมัติ) เพราะบางรายการเป็นยอดเฉพาะปีนั้นจริงๆ ไม่ควรถูกลากไปทุกปีคาดการณ์
export type ProjectionFlags = Record<string, boolean>

export function useTaxReturnDeductions(taxYear: number | null) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<DeductionEntries>({})
  const [projectionFlags, setProjectionFlags] = useState<ProjectionFlags>({})
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user || !taxYear) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('tax_return_deductions')
      .select('item_key, amount_satang, use_in_projection')
      .eq('user_id', user.id)
      .eq('tax_year', taxYear)

    const map: DeductionEntries = {}
    const flags: ProjectionFlags = {}
    for (const row of data ?? []) {
      map[row.item_key] = row.amount_satang
      flags[row.item_key] = row.use_in_projection
    }
    setEntries(map)
    setProjectionFlags(flags)
    setLoading(false)
  }, [user, taxYear])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveItem = useCallback(
    async (itemKey: string, amountSatang: number, useInProjection: boolean) => {
      if (!user || !taxYear) return { error: 'ไม่พบผู้ใช้หรือปีภาษี' }
      const { error } = await supabase
        .from('tax_return_deductions')
        .upsert(
          { user_id: user.id, tax_year: taxYear, item_key: itemKey, amount_satang: amountSatang, use_in_projection: useInProjection },
          { onConflict: 'user_id,tax_year,item_key' },
        )
      if (!error) {
        setEntries((prev) => ({ ...prev, [itemKey]: amountSatang }))
        setProjectionFlags((prev) => ({ ...prev, [itemKey]: useInProjection }))
      }
      return { error: error?.message ?? null }
    },
    [user, taxYear],
  )

  return { entries, projectionFlags, loading, saveItem }
}
