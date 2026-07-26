import { supabase } from '../../lib/supabase'
import type { TaxBracket, TaxDeductionItem, TaxExpenseRule, TaxRentalRate } from './types'

// สร้าง config version ใหม่ (ไม่ overwrite ของเก่า) — admin เท่านั้นที่ insert ผ่านได้จริง (บังคับที่ RLS/is_admin() แล้ว)
// ถ้า insert ลูกตารางใดล้มเหลว ลบ version ที่เพิ่งสร้างทิ้ง กัน v_tax_config_current ไปหยิบ version ที่ข้อมูลไม่ครบมาใช้คำนวณ
export async function reviseTaxConfig(params: {
  taxYear: number
  nextVersionNo: number
  effectiveFrom: string
  note: string
  retirementCombinedCapSatang: number
  lifeHealthCombinedCapSatang: number
  section48_2ThresholdSatang: number
  section48_2RatePercent: number
  section48_2ExemptTaxSatang: number
  brackets: TaxBracket[]
  expenseRules: TaxExpenseRule[]
  rentalRates: TaxRentalRate[]
  deductionItems: TaxDeductionItem[]
}): Promise<{ error: string | null }> {
  const { data: userData } = await supabase.auth.getUser()

  const { data: version, error: versionError } = await supabase
    .from('tax_config_versions')
    .insert({
      tax_year: params.taxYear,
      version_no: params.nextVersionNo,
      effective_from: params.effectiveFrom,
      note: params.note || null,
      retirement_combined_cap_satang: params.retirementCombinedCapSatang,
      life_health_combined_cap_satang: params.lifeHealthCombinedCapSatang,
      section48_2_threshold_satang: params.section48_2ThresholdSatang,
      section48_2_rate_percent: params.section48_2RatePercent,
      section48_2_exempt_tax_satang: params.section48_2ExemptTaxSatang,
      created_by: userData.user?.id,
    })
    .select('id')
    .single()

  if (versionError || !version) return { error: versionError?.message ?? 'สร้าง config version ใหม่ไม่สำเร็จ' }
  const versionId = version.id

  const [bracketsRes, rulesRes, ratesRes, itemsRes] = await Promise.all([
    supabase.from('tax_brackets').insert(
      params.brackets.map((b) => ({
        config_version_id: versionId,
        seq: b.seq,
        min_income_satang: b.min_income_satang,
        max_income_satang: b.max_income_satang,
        rate_percent: b.rate_percent,
      })),
    ),
    supabase.from('tax_expense_rules').insert(
      params.expenseRules.map((r) => ({
        config_version_id: versionId,
        income_type: r.income_type,
        default_rate_percent: r.default_rate_percent,
        cap_satang: r.cap_satang,
        shared_group: r.shared_group,
        allow_actual: r.allow_actual,
        alt_rate_percent: r.alt_rate_percent,
        alt_label: r.alt_label,
        uses_category_table: r.uses_category_table,
      })),
    ),
    supabase.from('tax_rental_expense_rates').insert(
      params.rentalRates.map((r) => ({
        config_version_id: versionId,
        category_key: r.category_key,
        label_th: r.label_th,
        rate_percent: r.rate_percent,
      })),
    ),
    supabase.from('tax_deduction_items').insert(
      params.deductionItems.map((d) => ({
        config_version_id: versionId,
        key: d.key,
        label_th: d.label_th,
        category: d.category,
        calc_type: d.calc_type,
        unit_amount_satang: d.unit_amount_satang,
        cap_satang: d.cap_satang,
        percent_rate: d.percent_rate,
        retirement_group: d.retirement_group,
        life_health_group: d.life_health_group,
        double_amount: d.double_amount,
        sort_order: d.sort_order,
        note: d.note,
      })),
    ),
  ])

  const firstError = bracketsRes.error || rulesRes.error || ratesRes.error || itemsRes.error
  if (firstError) {
    await supabase.from('tax_config_versions').delete().eq('id', versionId)
    return { error: firstError.message }
  }
  return { error: null }
}
