import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { EMPTY_TAX_RETURN_HEADER, type ExpenseMethodChoices, type TaxReturnHeader } from './types'

// header ต่อผู้ใช้ต่อปีภาษี (มีคู่สมรส/บุตร/บิดามารดา/วิธีหักค่าใช้จ่าย 40(5)-(8)) — upsert เพราะยังไม่มีแถวจนกว่าผู้ใช้จะกรอกครั้งแรก
export function useTaxReturn(taxYear: number | null) {
  const { user } = useAuth()
  const [header, setHeader] = useState<TaxReturnHeader>(EMPTY_TAX_RETURN_HEADER)
  const [configVersionId, setConfigVersionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user || !taxYear) {
      setLoading(false)
      return
    }
    setLoading(true)
    const { data } = await supabase.from('tax_returns').select('*').eq('user_id', user.id).eq('tax_year', taxYear).maybeSingle()

    if (data) {
      setHeader({
        has_spouse_no_income: data.has_spouse_no_income,
        child_first_count: data.child_first_count,
        child_subsequent_count: data.child_subsequent_count,
        parent_count: data.parent_count,
        disabled_dependent_count: data.disabled_dependent_count,
        expense_method_choices: (data.expense_method_choices as ExpenseMethodChoices) ?? {},
        pnd94_paid_satang: data.pnd94_paid_satang,
      })
      setConfigVersionId(data.config_version_id)
    } else {
      setHeader(EMPTY_TAX_RETURN_HEADER)
      setConfigVersionId(null)
    }
    setLoading(false)
  }, [user, taxYear])

  useEffect(() => {
    refresh()
  }, [refresh])

  const save = useCallback(
    async (next: TaxReturnHeader, latestConfigVersionId?: string) => {
      if (!user || !taxYear) return { error: 'ไม่พบผู้ใช้หรือปีภาษี' }
      const { error } = await supabase.from('tax_returns').upsert(
        {
          user_id: user.id,
          tax_year: taxYear,
          ...next,
          ...(latestConfigVersionId ? { config_version_id: latestConfigVersionId } : {}),
        },
        { onConflict: 'user_id,tax_year' },
      )
      if (!error) await refresh()
      return { error: error?.message ?? null }
    },
    [user, taxYear, refresh],
  )

  return { header, configVersionId, loading, save }
}
