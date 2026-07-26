import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database'

// log ภาษีหัก ณ ที่จ่ายแต่ละใบ กรอกมือ (schema transaction เดิมไม่มี field นี้ — ดู SPEC-tax.md)
export function useWithholding(taxYear: number | null) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<Tables<'tax_withholding_entries'>[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user || !taxYear) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase
      .from('tax_withholding_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('tax_year', taxYear)
      .order('created_at', { ascending: false })
    setEntries(data ?? [])
    setLoading(false)
  }, [user, taxYear])

  useEffect(() => {
    refresh()
  }, [refresh])

  const add = useCallback(
    async (sourceLabel: string, amountSatang: number, note: string) => {
      if (!user || !taxYear) return { error: 'ไม่พบผู้ใช้หรือปีภาษี' }
      const { error } = await supabase
        .from('tax_withholding_entries')
        .insert({ user_id: user.id, tax_year: taxYear, source_label: sourceLabel, amount_satang: amountSatang, note: note || null })
      if (!error) await refresh()
      return { error: error?.message ?? null }
    },
    [user, taxYear, refresh],
  )

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('tax_withholding_entries').delete().eq('id', id)
      if (!error) await refresh()
      return { error: error?.message ?? null }
    },
    [refresh],
  )

  const total = entries.reduce((s, e) => s + e.amount_satang, 0)

  return { entries, total, loading, add, remove }
}
