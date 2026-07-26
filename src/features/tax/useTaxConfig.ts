import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { FullTaxConfig } from './types'

// รายปีภาษีที่มี config อยู่จริง (ดึงจาก DB ไม่ hardcode — เพิ่มปีใหม่ทำผ่านหน้าตั้งค่าภาษี)
export function useAvailableTaxYears() {
  const [years, setYears] = useState<number[]>([])

  useEffect(() => {
    supabase
      .from('tax_config_versions')
      .select('tax_year')
      .then(({ data }) => {
        const unique = Array.from(new Set((data ?? []).map((r) => r.tax_year))).sort((a, b) => b - a)
        setYears(unique)
      })
  }, [])

  return years
}

// config version ล่าสุดของปีภาษีที่เลือก (v_tax_config_current) + ตารางลูกทั้งหมด ประกอบเป็น FullTaxConfig
export function useTaxConfig(taxYear: number | null) {
  const [config, setConfig] = useState<FullTaxConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!taxYear) {
      setConfig(null)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data: version, error: versionError } = await supabase
      .from('v_tax_config_current')
      .select('*')
      .eq('tax_year', taxYear)
      .maybeSingle()

    if (versionError || !version || !version.id) {
      setError(versionError?.message ?? `ยังไม่มี config ภาษีสำหรับปีภาษี ${taxYear}`)
      setConfig(null)
      setLoading(false)
      return
    }

    const versionId = version.id
    const [brackets, expenseRules, rentalRates, deductionItems] = await Promise.all([
      supabase.from('tax_brackets').select('*').eq('config_version_id', versionId).order('seq'),
      supabase.from('tax_expense_rules').select('*').eq('config_version_id', versionId),
      supabase.from('tax_rental_expense_rates').select('*').eq('config_version_id', versionId),
      supabase.from('tax_deduction_items').select('*').eq('config_version_id', versionId).order('sort_order'),
    ])

    setConfig({
      version: version as FullTaxConfig['version'],
      brackets: (brackets.data ?? []) as FullTaxConfig['brackets'],
      expenseRules: (expenseRules.data ?? []) as FullTaxConfig['expenseRules'],
      rentalRates: (rentalRates.data ?? []) as FullTaxConfig['rentalRates'],
      deductionItems: (deductionItems.data ?? []) as FullTaxConfig['deductionItems'],
    })
    setLoading(false)
  }, [taxYear])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { config, loading, error, refresh }
}
