import { useEffect, useState } from 'react'
import { bahtToSatang, satangToBaht } from '../../lib/money'
import { INCOME_TYPE_LABEL } from '../accounts/constants'
import { todayLocalDateString } from '../../lib/date'
import { reviseTaxConfig } from './taxConfigActions'
import { calculateTaxReturn } from './taxCalculations'
import { DEDUCTION_CATEGORY_LABEL, DEDUCTION_CATEGORY_ORDER } from './constants'
import type {
  DeductionCalcType,
  DeductionCategory,
  DeductionEntries,
  FullTaxConfig,
  IncomeByType,
  TaxReturnHeader,
} from './types'

type BracketDraft = { seq: number; min_baht: string; max_baht: string; rate_percent: string }
type RuleDraft = {
  income_type: string
  default_rate_percent: string
  cap_baht: string
  alt_rate_percent: string
  alt_label: string
  shared_group: string | null
  allow_actual: boolean
  uses_category_table: boolean
}
type RateDraft = { category_key: string; label_th: string; rate_percent: string }
type ItemDraft = {
  key: string
  label_th: string
  category: DeductionCategory
  calc_type: DeductionCalcType
  unit_amount_baht: string
  cap_baht: string
  percent_rate: string
  retirement_group: boolean
  life_health_group: boolean
  double_amount: boolean
  sort_order: number
  note: string
}

function toBracketDrafts(config: FullTaxConfig): BracketDraft[] {
  return config.brackets.map((b) => ({
    seq: b.seq,
    min_baht: String(satangToBaht(b.min_income_satang)),
    max_baht: b.max_income_satang != null ? String(satangToBaht(b.max_income_satang)) : '',
    rate_percent: String(b.rate_percent),
  }))
}

function toRuleDrafts(config: FullTaxConfig): RuleDraft[] {
  return config.expenseRules.map((r) => ({
    income_type: r.income_type,
    default_rate_percent: String(r.default_rate_percent),
    cap_baht: r.cap_satang != null ? String(satangToBaht(r.cap_satang)) : '',
    alt_rate_percent: r.alt_rate_percent != null ? String(r.alt_rate_percent) : '',
    alt_label: r.alt_label ?? '',
    shared_group: r.shared_group,
    allow_actual: r.allow_actual,
    uses_category_table: r.uses_category_table,
  }))
}

function toRateDrafts(config: FullTaxConfig): RateDraft[] {
  return config.rentalRates.map((r) => ({ category_key: r.category_key, label_th: r.label_th, rate_percent: String(r.rate_percent) }))
}

function toItemDrafts(config: FullTaxConfig): ItemDraft[] {
  return config.deductionItems.map((d) => ({
    key: d.key,
    label_th: d.label_th,
    category: d.category,
    calc_type: d.calc_type,
    unit_amount_baht: d.unit_amount_satang != null ? String(satangToBaht(d.unit_amount_satang)) : '',
    cap_baht: d.cap_satang != null ? String(satangToBaht(d.cap_satang)) : '',
    percent_rate: d.percent_rate != null ? String(d.percent_rate) : '',
    retirement_group: d.retirement_group,
    life_health_group: d.life_health_group,
    double_amount: d.double_amount,
    sort_order: d.sort_order,
    note: d.note ?? '',
  }))
}

export function TaxSettingsTab({
  taxYear,
  config,
  isAdmin,
  incomeByType,
  header,
  deductionEntries,
  totalWithholding,
  onSaved,
}: {
  taxYear: number
  config: FullTaxConfig
  isAdmin: boolean
  incomeByType: IncomeByType
  header: TaxReturnHeader
  deductionEntries: DeductionEntries
  totalWithholding: number
  onSaved: () => void
}) {
  const [effectiveFrom, setEffectiveFrom] = useState(todayLocalDateString())
  const [note, setNote] = useState('')
  const [retirementCapBaht, setRetirementCapBaht] = useState('')
  const [lifeHealthCapBaht, setLifeHealthCapBaht] = useState('')
  const [thresholdBaht, setThresholdBaht] = useState('')
  const [ratePercent, setRatePercent] = useState('')
  const [exemptBaht, setExemptBaht] = useState('')
  const [brackets, setBrackets] = useState<BracketDraft[]>([])
  const [rules, setRules] = useState<RuleDraft[]>([])
  const [rates, setRates] = useState<RateDraft[]>([])
  const [items, setItems] = useState<ItemDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setNote('')
    setRetirementCapBaht(String(satangToBaht(config.version.retirement_combined_cap_satang)))
    setLifeHealthCapBaht(String(satangToBaht(config.version.life_health_combined_cap_satang)))
    setThresholdBaht(String(satangToBaht(config.version.section48_2_threshold_satang)))
    setRatePercent(String(config.version.section48_2_rate_percent))
    setExemptBaht(String(satangToBaht(config.version.section48_2_exempt_tax_satang)))
    setBrackets(toBracketDrafts(config))
    setRules(toRuleDrafts(config))
    setRates(toRateDrafts(config))
    setItems(toItemDrafts(config))
    setSaved(false)
  }, [config])

  // preview สด — ทุกคนลองปรับดูผลกระทบต่อภาษีของตัวเองได้ (ไม่บันทึกจนกว่า admin จะกดบันทึก)
  let previewTax: number | null = null
  try {
    const draftConfig: FullTaxConfig = {
      version: {
        ...config.version,
        retirement_combined_cap_satang: bahtToSatang(retirementCapBaht),
        life_health_combined_cap_satang: bahtToSatang(lifeHealthCapBaht),
        section48_2_threshold_satang: bahtToSatang(thresholdBaht),
        section48_2_rate_percent: Number(ratePercent) || 0,
        section48_2_exempt_tax_satang: bahtToSatang(exemptBaht),
      },
      brackets: brackets.map((b) => ({
        seq: b.seq,
        min_income_satang: bahtToSatang(b.min_baht),
        max_income_satang: b.max_baht ? bahtToSatang(b.max_baht) : null,
        rate_percent: Number(b.rate_percent) || 0,
      })),
      expenseRules: rules.map((r) => ({
        income_type: r.income_type as never,
        default_rate_percent: Number(r.default_rate_percent) || 0,
        cap_satang: r.cap_baht ? bahtToSatang(r.cap_baht) : null,
        shared_group: r.shared_group,
        allow_actual: r.allow_actual,
        alt_rate_percent: r.alt_rate_percent ? Number(r.alt_rate_percent) : null,
        alt_label: r.alt_label || null,
        uses_category_table: r.uses_category_table,
      })),
      rentalRates: rates.map((r) => ({ category_key: r.category_key, label_th: r.label_th, rate_percent: Number(r.rate_percent) || 0 })),
      deductionItems: items.map((d) => ({
        key: d.key,
        label_th: d.label_th,
        category: d.category,
        calc_type: d.calc_type,
        unit_amount_satang: d.unit_amount_baht ? bahtToSatang(d.unit_amount_baht) : null,
        cap_satang: d.cap_baht ? bahtToSatang(d.cap_baht) : null,
        percent_rate: d.percent_rate ? Number(d.percent_rate) : null,
        retirement_group: d.retirement_group,
        life_health_group: d.life_health_group,
        double_amount: d.double_amount,
        sort_order: d.sort_order,
        note: d.note || null,
      })),
    }
    previewTax = calculateTaxReturn({ incomeByType, config: draftConfig, header, deductionEntries, totalWithholding }).finalTax
  } catch {
    previewTax = null
  }

  const addBracket = () => {
    const lastSeq = brackets.length ? brackets[brackets.length - 1].seq : 0
    setBrackets([...brackets, { seq: lastSeq + 1, min_baht: '', max_baht: '', rate_percent: '' }])
  }
  const removeBracket = (seq: number) => setBrackets(brackets.filter((b) => b.seq !== seq))

  const addRate = () => setRates([...rates, { category_key: `custom_${rates.length + 1}`, label_th: '', rate_percent: '' }])
  const removeRate = (categoryKey: string) => setRates(rates.filter((r) => r.category_key !== categoryKey))

  const addItem = (category: DeductionCategory) =>
    setItems([
      ...items,
      {
        key: `new_item_${items.length + 1}`,
        label_th: '',
        category,
        calc_type: 'user_amount',
        unit_amount_baht: '',
        cap_baht: '',
        percent_rate: '',
        retirement_group: false,
        life_health_group: false,
        double_amount: false,
        sort_order: items.length + 1,
        note: '',
      },
    ])
  const removeItem = (key: string) => setItems(items.filter((i) => i.key !== key))

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)

    const result = await reviseTaxConfig({
      taxYear,
      nextVersionNo: config.version.version_no + 1,
      effectiveFrom,
      note,
      retirementCombinedCapSatang: bahtToSatang(retirementCapBaht),
      lifeHealthCombinedCapSatang: bahtToSatang(lifeHealthCapBaht),
      section48_2ThresholdSatang: bahtToSatang(thresholdBaht),
      section48_2RatePercent: Number(ratePercent) || 0,
      section48_2ExemptTaxSatang: bahtToSatang(exemptBaht),
      brackets: brackets.map((b) => ({
        seq: b.seq,
        min_income_satang: bahtToSatang(b.min_baht),
        max_income_satang: b.max_baht ? bahtToSatang(b.max_baht) : null,
        rate_percent: Number(b.rate_percent) || 0,
      })),
      expenseRules: rules.map((r) => ({
        income_type: r.income_type as never,
        default_rate_percent: Number(r.default_rate_percent) || 0,
        cap_satang: r.cap_baht ? bahtToSatang(r.cap_baht) : null,
        shared_group: r.shared_group,
        allow_actual: r.allow_actual,
        alt_rate_percent: r.alt_rate_percent ? Number(r.alt_rate_percent) : null,
        alt_label: r.alt_label || null,
        uses_category_table: r.uses_category_table,
      })),
      rentalRates: rates.map((r) => ({ category_key: r.category_key, label_th: r.label_th, rate_percent: Number(r.rate_percent) || 0 })),
      deductionItems: items.map((d) => ({
        key: d.key,
        label_th: d.label_th,
        category: d.category,
        calc_type: d.calc_type,
        unit_amount_satang: d.unit_amount_baht ? bahtToSatang(d.unit_amount_baht) : null,
        cap_satang: d.cap_baht ? bahtToSatang(d.cap_baht) : null,
        percent_rate: d.percent_rate ? Number(d.percent_rate) : null,
        retirement_group: d.retirement_group,
        life_health_group: d.life_health_group,
        double_amount: d.double_amount,
        sort_order: d.sort_order,
        note: d.note || null,
      })),
    })

    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setSaved(true)
    onSaved()
  }

  return (
    <div>
      <div className="field-hint" style={{ margin: '0 0 16px' }}>
        ปรับตัวเลขด้านล่างเพื่อดูผลกระทบต่อภาษีของคุณเองได้ทันที (ยังไม่บันทึกจนกว่าจะกดปุ่มบันทึก) — บันทึกจริงได้เฉพาะ username{' '}
        <strong>admin</strong> เท่านั้น การบันทึกจะสร้าง version ใหม่ (v{config.version.version_no + 1}) ของปีภาษี {taxYear} โดยไม่ทับของเดิม
      </div>

      {previewTax != null && (
        <div className="banner-info" style={{ marginBottom: 16 }}>
          ถ้าใช้ค่านี้ ภาษีของคุณจะเป็น {(previewTax / 100).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท
        </div>
      )}

      {error && <div className="banner-error">{error}</div>}
      {saved && <div className="banner-info">บันทึก version ใหม่แล้ว</div>}

      <div className="group-title">ข้อมูล version ใหม่</div>
      <div className="card">
        <div className="field">
          <label htmlFor="effectiveFrom">วันที่มีผลบังคับใช้</label>
          <input id="effectiveFrom" type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="revNote">หมายเหตุ (เหตุผลที่แก้)</label>
          <input id="revNote" value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น ปรับเพดาน RMF ตามประกาศใหม่" />
        </div>
        <div className="field">
          <label htmlFor="retirementCap">เพดานรวมกลุ่มเกษียณ (บาท)</label>
          <input id="retirementCap" type="number" step="0.01" value={retirementCapBaht} onChange={(e) => setRetirementCapBaht(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="lifeHealthCap">เพดานรวม เบี้ยประกันชีวิต+สุขภาพตนเอง (บาท)</label>
          <input id="lifeHealthCap" type="number" step="0.01" value={lifeHealthCapBaht} onChange={(e) => setLifeHealthCapBaht(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="threshold48">มาตรา 48(2): threshold เงินได้ 40(2)-(8) (บาท)</label>
          <input id="threshold48" type="number" step="0.01" value={thresholdBaht} onChange={(e) => setThresholdBaht(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="rate48">มาตรา 48(2): อัตรา (%)</label>
          <input id="rate48" type="number" step="0.1" value={ratePercent} onChange={(e) => setRatePercent(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="exempt48">มาตรา 48(2): ยกเว้นถ้าภาษีไม่เกิน (บาท)</label>
          <input id="exempt48" type="number" step="0.01" value={exemptBaht} onChange={(e) => setExemptBaht(e.target.value)} />
        </div>
      </div>

      <div className="group-title">Bracket ขั้นบันได</div>
      <div className="card">
        {brackets.map((b, idx) => (
          <div key={b.seq} className="report-row">
            <div className="report-row-values" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input
                type="number"
                step="0.01"
                placeholder="ขั้นต่ำ (บาท)"
                value={b.min_baht}
                onChange={(e) => setBrackets(brackets.map((x, i) => (i === idx ? { ...x, min_baht: e.target.value } : x)))}
                style={{ width: 110 }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="ขั้นสูงสุด (ว่าง = ไม่จำกัด)"
                value={b.max_baht}
                onChange={(e) => setBrackets(brackets.map((x, i) => (i === idx ? { ...x, max_baht: e.target.value } : x)))}
                style={{ width: 150 }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="อัตรา %"
                value={b.rate_percent}
                onChange={(e) => setBrackets(brackets.map((x, i) => (i === idx ? { ...x, rate_percent: e.target.value } : x)))}
                style={{ width: 80 }}
              />
              <button type="button" className="btn btn-danger" onClick={() => removeBracket(b.seq)}>
                ลบ
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={addBracket} style={{ marginTop: 8 }}>
          + เพิ่มขั้น
        </button>
      </div>

      <div className="group-title">หักค่าใช้จ่ายตามประเภทเงินได้</div>
      <div className="card">
        {rules.map((r, idx) => (
          <div key={r.income_type} className="report-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div className="report-row-name">{INCOME_TYPE_LABEL[r.income_type as keyof typeof INCOME_TYPE_LABEL]}</div>
            <div className="report-row-values" style={{ gap: 8, flexWrap: 'wrap' }}>
              {!r.uses_category_table && (
                <input
                  type="number"
                  step="0.01"
                  placeholder="อัตราเหมา %"
                  value={r.default_rate_percent}
                  onChange={(e) => setRules(rules.map((x, i) => (i === idx ? { ...x, default_rate_percent: e.target.value } : x)))}
                  style={{ width: 100 }}
                />
              )}
              <input
                type="number"
                step="0.01"
                placeholder="เพดาน (บาท, ว่าง = ไม่จำกัด)"
                value={r.cap_baht}
                onChange={(e) => setRules(rules.map((x, i) => (i === idx ? { ...x, cap_baht: e.target.value } : x)))}
                style={{ width: 160 }}
              />
              {r.alt_label !== '' || r.alt_rate_percent !== '' ? (
                <>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="อัตราทางเลือก %"
                    value={r.alt_rate_percent}
                    onChange={(e) => setRules(rules.map((x, i) => (i === idx ? { ...x, alt_rate_percent: e.target.value } : x)))}
                    style={{ width: 120 }}
                  />
                  <input
                    placeholder="ชื่อทางเลือก"
                    value={r.alt_label}
                    onChange={(e) => setRules(rules.map((x, i) => (i === idx ? { ...x, alt_label: e.target.value } : x)))}
                    style={{ width: 140 }}
                  />
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="group-title">อัตราเหมาค่าเช่า (40(5))</div>
      <div className="card">
        {rates.map((r, idx) => (
          <div key={r.category_key} className="report-row">
            <div className="report-row-values" style={{ gap: 8, flexWrap: 'wrap' }}>
              <input
                placeholder="ชื่อประเภททรัพย์สิน"
                value={r.label_th}
                onChange={(e) => setRates(rates.map((x, i) => (i === idx ? { ...x, label_th: e.target.value } : x)))}
                style={{ width: 180 }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="อัตรา %"
                value={r.rate_percent}
                onChange={(e) => setRates(rates.map((x, i) => (i === idx ? { ...x, rate_percent: e.target.value } : x)))}
                style={{ width: 80 }}
              />
              <button type="button" className="btn btn-danger" onClick={() => removeRate(r.category_key)}>
                ลบ
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-secondary" onClick={addRate} style={{ marginTop: 8 }}>
          + เพิ่มประเภททรัพย์สิน
        </button>
      </div>

      {DEDUCTION_CATEGORY_ORDER.map((category) => (
        <div key={category}>
          <div className="group-title">{DEDUCTION_CATEGORY_LABEL[category]}</div>
          <div className="card">
            {items
              .filter((i) => i.category === category)
              .map((item) => {
                const idx = items.findIndex((i) => i.key === item.key)
                return (
                  <div key={item.key} className="report-row" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div className="report-row-values" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <input
                        placeholder="ชื่อรายการ"
                        value={item.label_th}
                        onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, label_th: e.target.value } : x)))}
                        style={{ width: 220 }}
                      />
                      {(item.calc_type === 'fixed' || item.calc_type === 'per_dependent') && (
                        <input
                          type="number"
                          step="0.01"
                          placeholder={item.calc_type === 'fixed' ? 'จำนวน (บาท)' : 'ต่อคน (บาท)'}
                          value={item.unit_amount_baht}
                          onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, unit_amount_baht: e.target.value } : x)))}
                          style={{ width: 130 }}
                        />
                      )}
                      <input
                        type="number"
                        step="0.01"
                        placeholder="เพดาน (บาท, ว่าง = ไม่จำกัด)"
                        value={item.cap_baht}
                        onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, cap_baht: e.target.value } : x)))}
                        style={{ width: 160 }}
                      />
                      <input
                        type="number"
                        step="0.01"
                        placeholder="% ของเงินได้ (ถ้ามี)"
                        value={item.percent_rate}
                        onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, percent_rate: e.target.value } : x)))}
                        style={{ width: 130 }}
                      />
                      <button type="button" className="btn btn-danger" onClick={() => removeItem(item.key)}>
                        ลบ
                      </button>
                    </div>
                    <label className="checkbox-field" style={{ marginTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={item.retirement_group}
                        onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, retirement_group: e.target.checked } : x)))}
                      />
                      อยู่ในเพดานรวมกลุ่มเกษียณ
                    </label>
                    <label className="checkbox-field" style={{ marginTop: 4 }}>
                      <input
                        type="checkbox"
                        checked={item.life_health_group}
                        onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, life_health_group: e.target.checked } : x)))}
                      />
                      อยู่ในเพดานรวมประกันชีวิต+สุขภาพ
                    </label>
                  </div>
                )
              })}
            <button type="button" className="btn btn-secondary" onClick={() => addItem(category)} style={{ marginTop: 8 }}>
              + เพิ่มรายการลดหย่อนใหม่
            </button>
          </div>
        </div>
      ))}

      {isAdmin ? (
        <button type="button" className="btn btn-block" onClick={handleSave} disabled={saving} style={{ marginTop: 16 }}>
          {saving ? 'กำลังบันทึก...' : `บันทึกเป็น version ใหม่ (v${config.version.version_no + 1})`}
        </button>
      ) : (
        <div className="banner-info" style={{ marginTop: 16 }}>
          เฉพาะ username admin เท่านั้นที่บันทึกค่ากลางนี้ได้ — การปรับด้านบนเป็นแค่การทดลองดูผลในเครื่องคุณเท่านั้น
        </div>
      )}
    </div>
  )
}
