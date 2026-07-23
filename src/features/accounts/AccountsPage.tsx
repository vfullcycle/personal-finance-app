import { useMemo, useState } from 'react'
import { useAccounts, type AccountRow } from './useAccounts'
import { AccountFormDialog } from './AccountFormDialog'
import { formatSatangAsBaht } from '../../lib/money'
import { ASSET_SUBTYPE_LABEL, LIABILITY_SUBTYPE_LABEL, type AccountType } from './constants'

const TABS: { id: AccountType; label: string }[] = [
  { id: 'asset', label: 'สินทรัพย์' },
  { id: 'liability', label: 'หนี้สิน' },
]

export function AccountsPage() {
  const [activeTab, setActiveTab] = useState<AccountType>('asset')
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<AccountRow | 'new' | null>(null)
  const { accounts, loading, error, refresh } = useAccounts(['asset', 'liability'])

  const groups = useMemo(() => {
    const filtered = accounts.filter((a) => a.type_id === activeTab && a.is_active !== showArchived)
    const bySubtype = new Map<string, AccountRow[]>()
    for (const a of filtered) {
      const key = a.subtype ?? 'other'
      const list = bySubtype.get(key) ?? []
      list.push(a)
      bySubtype.set(key, list)
    }
    return bySubtype
  }, [accounts, activeTab, showArchived])

  const subtypeOrder = activeTab === 'asset' ? Object.keys(ASSET_SUBTYPE_LABEL) : Object.keys(LIABILITY_SUBTYPE_LABEL)
  const subtypeLabel = (s: string) =>
    activeTab === 'asset'
      ? (ASSET_SUBTYPE_LABEL as Record<string, string>)[s] ?? s
      : (LIABILITY_SUBTYPE_LABEL as Record<string, string>)[s] ?? s

  const handleSaved = () => {
    setEditing(null)
    refresh()
  }

  const totalCount = Array.from(groups.values()).reduce((sum, list) => sum + list.length, 0)

  return (
    <div className="page">
      <div className="list-header">
        <h1>บัญชี</h1>
        <button type="button" className="btn" onClick={() => setEditing('new')}>
          + เพิ่มบัญชี
        </button>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn-secondary btn"
        style={{ marginBottom: 12 }}
        onClick={() => setShowArchived((v) => !v)}
      >
        {showArchived ? 'แสดงบัญชีที่ใช้งานอยู่' : 'แสดงบัญชีที่ปิดแล้ว'}
      </button>

      {error && <div className="banner-error">{error}</div>}

      {!loading && totalCount === 0 && (
        <div className="empty-state">ยังไม่มีบัญชี{showArchived ? 'ที่ปิด' : ''}ในกลุ่มนี้ กดปุ่ม + เพื่อเพิ่ม</div>
      )}

      {subtypeOrder.map((subtype) => {
        const list = groups.get(subtype)
        if (!list || list.length === 0) return null
        return (
          <div key={subtype}>
            <div className="group-title">{subtypeLabel(subtype)}</div>
            <div className="card">
              {list.map((acc) => (
                <button key={acc.id} type="button" className="item-row" onClick={() => setEditing(acc)}>
                  <div>
                    <div className="item-row-name">{acc.name}</div>
                    {acc.subtype === 'credit_card' && acc.credit_limit != null && (
                      <div className="item-row-sub">
                        วงเงินคงเหลือ {formatSatangAsBaht(acc.credit_limit - acc.balance)} บาท
                      </div>
                    )}
                  </div>
                  <div className={`item-row-balance${acc.balance < 0 ? ' negative' : ''}`}>
                    {formatSatangAsBaht(acc.balance)} บาท
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}

      {editing && (
        <AccountFormDialog
          typeId={activeTab}
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
