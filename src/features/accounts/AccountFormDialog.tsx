import { useState, type FormEvent } from 'react'
import { Modal } from '../../components/Modal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { bahtToSatang, satangToBaht } from '../../lib/money'
import { archiveAccount, deleteAccountHard, isForeignKeyViolation, unarchiveAccount } from './accountActions'
import {
  ASSET_SUBTYPE_LABEL,
  LIABILITY_SUBTYPE_LABEL,
  ASSET_LIQUIDITY_LABEL,
  TERM_LABEL,
  ASSET_SUBTYPE_DEFAULTS,
  LIABILITY_SUBTYPE_DEFAULTS,
  type AccountType,
  type AssetSubtype,
  type LiabilitySubtype,
  type AssetLiquidity,
  type Term,
} from './constants'
import type { AccountRow } from './useAccounts'

const ASSET_SUBTYPES = Object.keys(ASSET_SUBTYPE_LABEL) as AssetSubtype[]
const LIABILITY_SUBTYPES = Object.keys(LIABILITY_SUBTYPE_LABEL) as LiabilitySubtype[]

export function AccountFormDialog({
  typeId,
  initial,
  onClose,
  onSaved,
}: {
  typeId: AccountType
  initial: AccountRow | null
  onClose: () => void
  onSaved: () => void
}) {
  const { user } = useAuth()
  const isEdit = !!initial
  const isAsset = typeId === 'asset'

  const [subtype, setSubtype] = useState<string>(
    initial?.subtype ?? (isAsset ? ASSET_SUBTYPES[0] : LIABILITY_SUBTYPES[0]),
  )
  const [name, setName] = useState(initial?.name ?? '')
  const [openingBalance, setOpeningBalance] = useState(
    initial ? String(satangToBaht(initial.opening_balance)) : '0',
  )
  const [creditLimit, setCreditLimit] = useState(
    initial?.credit_limit != null ? String(satangToBaht(initial.credit_limit)) : '',
  )
  const [assetLiquidity, setAssetLiquidity] = useState<string>(
    initial?.asset_liquidity ?? (isAsset ? ASSET_SUBTYPE_DEFAULTS[subtype as AssetSubtype].asset_liquidity : 'liquid'),
  )
  const [isInvested, setIsInvested] = useState(
    initial?.is_invested ?? (isAsset ? ASSET_SUBTYPE_DEFAULTS[subtype as AssetSubtype].is_invested : false),
  )
  const [cashflowSavings, setCashflowSavings] = useState(initial?.cashflow_class === 'savings')
  const [term, setTerm] = useState<string>(
    initial?.term ?? (!isAsset ? LIABILITY_SUBTYPE_DEFAULTS[subtype as LiabilitySubtype].term : 'current'),
  )
  const [isMortgage, setIsMortgage] = useState(
    initial?.is_mortgage ?? (!isAsset ? LIABILITY_SUBTYPE_DEFAULTS[subtype as LiabilitySubtype].is_mortgage : false),
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubtypeChange = (value: string) => {
    setSubtype(value)
    if (isAsset) {
      const defaults = ASSET_SUBTYPE_DEFAULTS[value as AssetSubtype]
      setAssetLiquidity(defaults.asset_liquidity)
      setIsInvested(defaults.is_invested)
    } else {
      const defaults = LIABILITY_SUBTYPE_DEFAULTS[value as LiabilitySubtype]
      setTerm(defaults.term)
      setIsMortgage(defaults.is_mortgage)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setError(null)

    if (!name.trim()) {
      setError('กรุณากรอกชื่อบัญชี')
      return
    }

    setSubmitting(true)
    const payload = {
      user_id: user.id,
      type_id: typeId,
      subtype,
      name: name.trim(),
      opening_balance: bahtToSatang(openingBalance),
      credit_limit: subtype === 'credit_card' && creditLimit ? bahtToSatang(creditLimit) : null,
      asset_liquidity: isAsset ? (assetLiquidity as AssetLiquidity) : null,
      is_invested: isAsset ? isInvested : false,
      cashflow_class: isAsset && cashflowSavings ? 'savings' : null,
      term: !isAsset ? (term as Term) : null,
      is_mortgage: !isAsset && subtype === 'loan' ? isMortgage : false,
    }

    const { error: saveError } = isEdit
      ? await supabase.from('accounts').update(payload).eq('id', initial.id)
      : await supabase.from('accounts').insert(payload)

    setSubmitting(false)
    if (saveError) {
      setError(saveError.message)
      return
    }
    onSaved()
  }

  const handleArchive = async () => {
    if (!initial) return
    setSubmitting(true)
    const { error: archiveError } = initial.is_active ? await archiveAccount(initial.id) : await unarchiveAccount(initial.id)
    setSubmitting(false)
    if (archiveError) {
      setError(archiveError.message)
      return
    }
    onSaved()
  }

  const handleDelete = async () => {
    if (!initial) return
    if (!confirm(`ลบบัญชี "${initial.name}" ถาวร?`)) return
    setSubmitting(true)
    const { error: deleteError } = await deleteAccountHard(initial.id)
    setSubmitting(false)
    if (deleteError) {
      if (isForeignKeyViolation(deleteError)) {
        setError('ลบไม่ได้เพราะมีรายการผูกอยู่ ใช้การปิดบัญชีแทน')
      } else {
        setError(deleteError.message)
      }
      return
    }
    onSaved()
  }

  return (
    <Modal title={isEdit ? 'แก้ไขบัญชี' : 'เพิ่มบัญชี'} onClose={onClose}>
      {error && <div className="banner-error">{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="subtype">ชนิดบัญชี</label>
          <select id="subtype" value={subtype} onChange={(e) => handleSubtypeChange(e.target.value)}>
            {(isAsset ? ASSET_SUBTYPES : LIABILITY_SUBTYPES).map((s) => (
              <option key={s} value={s}>
                {isAsset ? ASSET_SUBTYPE_LABEL[s as AssetSubtype] : LIABILITY_SUBTYPE_LABEL[s as LiabilitySubtype]}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label htmlFor="name">ชื่อบัญชี</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น กสิกรออมทรัพย์" />
        </div>

        <div className="field">
          <label htmlFor="openingBalance">{isAsset ? 'ยอดยกมา (บาท)' : 'ยอดหนี้คงเหลือปัจจุบัน (บาท)'}</label>
          <input
            id="openingBalance"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />
        </div>

        {subtype === 'credit_card' && (
          <div className="field">
            <label htmlFor="creditLimit">วงเงินบัตร (บาท)</label>
            <input
              id="creditLimit"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
            />
          </div>
        )}

        <details className="disclosure">
          <summary>ตัวเลือกเพิ่มเติม</summary>

          {isAsset ? (
            <>
              <div className="field">
                <label htmlFor="assetLiquidity">สภาพคล่อง</label>
                <select id="assetLiquidity" value={assetLiquidity} onChange={(e) => setAssetLiquidity(e.target.value)}>
                  {Object.entries(ASSET_LIQUIDITY_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="checkbox-field">
                <input id="isInvested" type="checkbox" checked={isInvested} onChange={(e) => setIsInvested(e.target.checked)} />
                <label htmlFor="isInvested">นับเป็นสินทรัพย์ลงทุน</label>
              </div>
              <div className="checkbox-field">
                <input
                  id="cashflowSavings"
                  type="checkbox"
                  checked={cashflowSavings}
                  onChange={(e) => setCashflowSavings(e.target.checked)}
                />
                <label htmlFor="cashflowSavings">เป็นถังเงินออม (ปลายทางโอนเงินออม)</label>
              </div>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="term">ระยะหนี้</label>
                <select id="term" value={term} onChange={(e) => setTerm(e.target.value)}>
                  {Object.entries(TERM_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {subtype === 'loan' && (
                <div className="checkbox-field">
                  <input id="isMortgage" type="checkbox" checked={isMortgage} onChange={(e) => setIsMortgage(e.target.checked)} />
                  <label htmlFor="isMortgage">เป็นเงินกู้จำนอง (บ้าน)</label>
                </div>
              )}
            </>
          )}
        </details>

        <div className="form-actions">
          {isEdit && (
            <button type="button" className="btn btn-secondary" onClick={handleArchive} disabled={submitting}>
              {initial.is_active ? 'ปิดบัญชี' : 'เปิดใช้งานอีกครั้ง'}
            </button>
          )}
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
        {isEdit && (
          <button
            type="button"
            className="btn btn-danger btn-block"
            style={{ marginTop: 10 }}
            onClick={handleDelete}
            disabled={submitting}
          >
            ลบถาวร
          </button>
        )}
      </form>
    </Modal>
  )
}
