import { useEffect, useState } from 'react'
import { bahtToSatang, satangToBaht } from '../../lib/money'
import { INCOME_TYPE_LABEL } from '../accounts/constants'
import { DEDUCTION_CATEGORY_LABEL, DEDUCTION_CATEGORY_ORDER } from './constants'
import type { ProjectionFlags } from './useTaxReturnDeductions'
import type { DeductionEntries, ExpenseMethodChoices, FullTaxConfig, IncomeByType, TaxReturnHeader } from './types'

const PER_DEPENDENT_FIELD_LABEL: Record<string, keyof TaxReturnHeader> = {
  child_first: 'child_first_count',
  child_subsequent: 'child_subsequent_count',
  parent: 'parent_count',
  disabled_dependent: 'disabled_dependent_count',
}

export function DeductionsTab({
  config,
  incomeByType,
  header,
  entries,
  projectionFlags,
  saveHeader,
  saveEntry,
}: {
  config: FullTaxConfig
  incomeByType: IncomeByType
  header: TaxReturnHeader
  entries: DeductionEntries
  projectionFlags: ProjectionFlags
  saveHeader: (h: TaxReturnHeader, configVersionId?: string) => Promise<{ error: string | null }>
  saveEntry: (key: string, amountSatang: number, useInProjection: boolean) => Promise<{ error: string | null }>
}) {
  const [local, setLocal] = useState<TaxReturnHeader>(header)
  const [entryDrafts, setEntryDrafts] = useState<Record<string, string>>({})
  const [flagDrafts, setFlagDrafts] = useState<ProjectionFlags>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => setLocal(header), [header])
  useEffect(() => {
    const drafts: Record<string, string> = {}
    for (const [key, value] of Object.entries(entries)) drafts[key] = String(satangToBaht(value))
    setEntryDrafts(drafts)
  }, [entries])
  useEffect(() => setFlagDrafts(projectionFlags), [projectionFlags])

  const setChoice = (type: '40(5)' | '40(6)' | '40(7)' | '40(8)', choice: ExpenseMethodChoices[typeof type]) => {
    setLocal((prev) => ({ ...prev, expense_method_choices: { ...prev.expense_method_choices, [type]: choice } }))
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)

    const headerResult = await saveHeader(local, config.version.id)
    if (headerResult.error) {
      setError(headerResult.error)
      setSaving(false)
      return
    }

    for (const item of config.deductionItems.filter((i) => i.calc_type === 'user_amount')) {
      const draft = entryDrafts[item.key]
      const amount = draft ? bahtToSatang(draft) : 0
      const useInProjection = flagDrafts[item.key] ?? false
      if (amount !== (entries[item.key] ?? 0) || useInProjection !== (projectionFlags[item.key] ?? false)) {
        const r = await saveEntry(item.key, amount, useInProjection)
        if (r.error) {
          setError(r.error)
          setSaving(false)
          return
        }
      }
    }

    setSaving(false)
    setSaved(true)
  }

  const rule40_5 = config.expenseRules.find((r) => r.income_type === '40(5)')
  const rule40_6 = config.expenseRules.find((r) => r.income_type === '40(6)')
  const rule40_7 = config.expenseRules.find((r) => r.income_type === '40(7)')
  const rule40_8 = config.expenseRules.find((r) => r.income_type === '40(8)')

  return (
    <div>
      {error && <div className="banner-error">{error}</div>}
      {saved && <div className="banner-info">บันทึกแล้ว</div>}

      <div className="group-title">ส่วนตัว/ครอบครัว</div>
      <div className="card">
        <div className="checkbox-field">
          <input
            id="hasSpouse"
            type="checkbox"
            checked={local.has_spouse_no_income}
            onChange={(e) => setLocal((prev) => ({ ...prev, has_spouse_no_income: e.target.checked }))}
          />
          <label htmlFor="hasSpouse">มีคู่สมรสที่ไม่มีเงินได้</label>
        </div>

        {Object.entries(PER_DEPENDENT_FIELD_LABEL).map(([key, field]) => {
          const item = config.deductionItems.find((i) => i.key === key)
          if (!item) return null
          return (
            <div className="field" key={key}>
              <label htmlFor={key}>{item.label_th}</label>
              <input
                id={key}
                type="number"
                min={0}
                max={key === 'parent' ? 4 : undefined}
                value={local[field] as number}
                onChange={(e) => setLocal((prev) => ({ ...prev, [field]: Math.max(0, Number(e.target.value) || 0) }))}
              />
            </div>
          )
        })}
      </div>

      {(rule40_5?.uses_category_table && (incomeByType['40(5)'] ?? 0) > 0) && (
        <>
          <div className="group-title">วิธีหักค่าใช้จ่าย — {INCOME_TYPE_LABEL['40(5)']}</div>
          <div className="card">
            <div className="field">
              <label>วิธี</label>
              <select
                value={local.expense_method_choices['40(5)']?.method ?? 'flat'}
                onChange={(e) =>
                  setChoice(
                    '40(5)',
                    e.target.value === 'actual'
                      ? { method: 'actual', amount_satang: 0 }
                      : { method: 'flat', category_key: config.rentalRates[0]?.category_key },
                  )
                }
              >
                <option value="flat">หักเหมาตามประเภททรัพย์สิน</option>
                <option value="actual">หักตามจริง (กรอกยอดเอง)</option>
              </select>
            </div>
            {local.expense_method_choices['40(5)']?.method === 'actual' ? (
              <div className="field">
                <label>ยอดค่าใช้จ่ายจริง (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={satangToBaht(
                    local.expense_method_choices['40(5)']?.method === 'actual' ? local.expense_method_choices['40(5)'].amount_satang : 0,
                  )}
                  onChange={(e) => setChoice('40(5)', { method: 'actual', amount_satang: bahtToSatang(e.target.value) })}
                />
              </div>
            ) : (
              <div className="field">
                <label>ประเภททรัพย์สิน</label>
                <select
                  value={
                    (local.expense_method_choices['40(5)']?.method === 'flat' && local.expense_method_choices['40(5)'].category_key) ||
                    config.rentalRates[0]?.category_key
                  }
                  onChange={(e) => setChoice('40(5)', { method: 'flat', category_key: e.target.value })}
                >
                  {config.rentalRates.map((r) => (
                    <option key={r.category_key} value={r.category_key}>
                      {r.label_th} ({r.rate_percent}%)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </>
      )}

      {rule40_6 && (incomeByType['40(6)'] ?? 0) > 0 && (
        <>
          <div className="group-title">วิธีหักค่าใช้จ่าย — {INCOME_TYPE_LABEL['40(6)']}</div>
          <div className="card">
            <div className="field">
              <label>วิธี</label>
              <select
                value={local.expense_method_choices['40(6)']?.method ?? 'flat'}
                onChange={(e) =>
                  setChoice('40(6)', e.target.value === 'actual' ? { method: 'actual', amount_satang: 0 } : { method: 'flat', is_medical: false })
                }
              >
                <option value="flat">หักเหมา</option>
                <option value="actual">หักตามจริง (กรอกยอดเอง)</option>
              </select>
            </div>
            {local.expense_method_choices['40(6)']?.method === 'actual' ? (
              <div className="field">
                <label>ยอดค่าใช้จ่ายจริง (บาท)</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={satangToBaht(
                    local.expense_method_choices['40(6)']?.method === 'actual' ? local.expense_method_choices['40(6)'].amount_satang : 0,
                  )}
                  onChange={(e) => setChoice('40(6)', { method: 'actual', amount_satang: bahtToSatang(e.target.value) })}
                />
              </div>
            ) : (
              <div className="checkbox-field">
                <input
                  id="isMedical"
                  type="checkbox"
                  checked={local.expense_method_choices['40(6)']?.method === 'flat' && local.expense_method_choices['40(6)'].is_medical === true}
                  onChange={(e) => setChoice('40(6)', { method: 'flat', is_medical: e.target.checked })}
                />
                <label htmlFor="isMedical">ประกอบโรคศิลปะ ({rule40_6.alt_rate_percent}% แทน {rule40_6.default_rate_percent}%)</label>
              </div>
            )}
          </div>
        </>
      )}

      {[
        { type: '40(7)' as const, rule: rule40_7 },
        { type: '40(8)' as const, rule: rule40_8 },
      ].map(
        ({ type, rule }) =>
          rule &&
          (incomeByType[type] ?? 0) > 0 && (
            <div key={type}>
              <div className="group-title">วิธีหักค่าใช้จ่าย — {INCOME_TYPE_LABEL[type]}</div>
              <div className="card">
                <div className="field">
                  <label>วิธี</label>
                  <select
                    value={local.expense_method_choices[type]?.method ?? 'flat'}
                    onChange={(e) => setChoice(type, e.target.value === 'actual' ? { method: 'actual', amount_satang: 0 } : { method: 'flat' })}
                  >
                    <option value="flat">หักเหมา {rule.default_rate_percent}%</option>
                    <option value="actual">หักตามจริง (กรอกยอดเอง)</option>
                  </select>
                </div>
                {local.expense_method_choices[type]?.method === 'actual' && (
                  <div className="field">
                    <label>ยอดค่าใช้จ่ายจริง (บาท)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={satangToBaht(
                        local.expense_method_choices[type]?.method === 'actual' ? local.expense_method_choices[type]!.amount_satang : 0,
                      )}
                      onChange={(e) => setChoice(type, { method: 'actual', amount_satang: bahtToSatang(e.target.value) })}
                    />
                  </div>
                )}
              </div>
            </div>
          ),
      )}

      {DEDUCTION_CATEGORY_ORDER.filter((c) => c !== 'personal_family').map((category) => {
        const items = config.deductionItems.filter((i) => i.category === category && i.calc_type === 'user_amount')
        if (items.length === 0) return null
        return (
          <div key={category}>
            <div className="group-title">{DEDUCTION_CATEGORY_LABEL[category]}</div>
            <div className="card">
              {items.map((item) => (
                <div className="field" key={item.key}>
                  <label htmlFor={item.key}>{item.label_th}</label>
                  <input
                    id={item.key}
                    type="number"
                    step="0.01"
                    min={0}
                    value={entryDrafts[item.key] ?? ''}
                    onChange={(e) => setEntryDrafts((prev) => ({ ...prev, [item.key]: e.target.value }))}
                  />
                  {item.note && <div className="field-hint">{item.note}</div>}
                  <div className="checkbox-field">
                    <input
                      id={`${item.key}_useInProjection`}
                      type="checkbox"
                      checked={flagDrafts[item.key] ?? false}
                      onChange={(e) => setFlagDrafts((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                    />
                    <label htmlFor={`${item.key}_useInProjection`}>ใช้ค่านี้ในงบประมาณด้วย</label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <button type="button" className="btn btn-block" onClick={handleSave} disabled={saving} style={{ marginTop: 16 }}>
        {saving ? 'กำลังบันทึก...' : 'บันทึก'}
      </button>
    </div>
  )
}
