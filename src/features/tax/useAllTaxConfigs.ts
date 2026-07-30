import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAvailableTaxYears } from './useTaxConfig'
import type { FullTaxConfig } from './types'

async function fetchFullTaxConfig(taxYear: number): Promise<FullTaxConfig | null> {
  const { data: version } = await supabase.from('v_tax_config_current').select('*').eq('tax_year', taxYear).maybeSingle()
  if (!version || !version.id) return null

  const versionId = version.id
  const [brackets, expenseRules, rentalRates, deductionItems] = await Promise.all([
    supabase.from('tax_brackets').select('*').eq('config_version_id', versionId).order('seq'),
    supabase.from('tax_expense_rules').select('*').eq('config_version_id', versionId),
    supabase.from('tax_rental_expense_rates').select('*').eq('config_version_id', versionId),
    supabase.from('tax_deduction_items').select('*').eq('config_version_id', versionId).order('sort_order'),
  ])

  return {
    version: version as FullTaxConfig['version'],
    brackets: (brackets.data ?? []) as FullTaxConfig['brackets'],
    expenseRules: (expenseRules.data ?? []) as FullTaxConfig['expenseRules'],
    rentalRates: (rentalRates.data ?? []) as FullTaxConfig['rentalRates'],
    deductionItems: (deductionItems.data ?? []) as FullTaxConfig['deductionItems'],
  }
}

// ดึง FullTaxConfig ของ "ทุก" ปีภาษีที่มี config จริงพร้อมกัน (ต่างจาก useTaxConfig ที่ดึงทีละปีตามที่ผู้ใช้เลือกดูในหน้า /tax)
// ใช้สำหรับ projection (C7 ช่วง 2) ที่ต้องคำนวณภาษีของหลายปีพร้อมกัน — ปีที่ config ต่างกันจริง (เช่นเพดานประกันสังคม) ต้องใช้ config ของปีนั้นตรงๆ
// ปีที่เกิน config ที่มีจริง ฝั่งเรียกใช้ (projectionCalculations.ts) จะ fallback ไปใช้ปีล่าสุดเอง ไม่ใช่หน้าที่ของ hook นี้
export function useAllTaxConfigs() {
  const years = useAvailableTaxYears()
  const [configs, setConfigs] = useState<Map<number, FullTaxConfig>>(new Map())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (years.length === 0) {
      setConfigs(new Map())
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    Promise.all(years.map(async (y) => [y, await fetchFullTaxConfig(y)] as const)).then((pairs) => {
      if (cancelled) return
      const map = new Map<number, FullTaxConfig>()
      for (const [y, cfg] of pairs) if (cfg) map.set(y, cfg)
      setConfigs(map)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [years.join(',')])

  return { configs, years, loading }
}
