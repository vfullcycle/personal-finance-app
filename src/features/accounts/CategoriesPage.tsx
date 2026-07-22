import { useMemo, useState } from 'react'
import { useAccounts, type AccountRow } from './useAccounts'
import { CategoryFormDialog } from './CategoryFormDialog'
import type { AccountType } from './constants'

const TABS: { id: AccountType; label: string }[] = [
  { id: 'income', label: 'รายได้' },
  { id: 'expense', label: 'ค่าใช้จ่าย' },
  { id: 'equity', label: 'ทุน' },
]

export function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<AccountType>('income')
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<AccountRow | 'new' | null>(null)
  const { accounts, loading, error, refresh } = useAccounts(['income', 'expense', 'equity'])

  const visible = useMemo(() => {
    const filtered = accounts.filter((a) => a.type_id === activeTab && a.is_active !== showArchived)
    const topLevel = filtered.filter((a) => !a.parent_id)
    const childrenByParent = new Map<string, AccountRow[]>()
    for (const a of filtered) {
      if (a.parent_id) {
        const list = childrenByParent.get(a.parent_id) ?? []
        list.push(a)
        childrenByParent.set(a.parent_id, list)
      }
    }
    return { topLevel, childrenByParent }
  }, [accounts, activeTab, showArchived])

  const handleSaved = () => {
    setEditing(null)
    refresh()
  }

  return (
    <div className="page">
      <div className="list-header">
        <h1>หมวดหมู่</h1>
        <button type="button" className="btn" onClick={() => setEditing('new')}>
          + เพิ่มหมวดหมู่
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
        {showArchived ? 'แสดงหมวดหมู่ที่ใช้งานอยู่' : 'แสดงหมวดหมู่ที่ปิดแล้ว'}
      </button>

      {error && <div className="banner-error">{error}</div>}

      {!loading && visible.topLevel.length === 0 && (
        <div className="empty-state">ยังไม่มีหมวดหมู่{showArchived ? 'ที่ปิด' : ''}ในกลุ่มนี้</div>
      )}

      <div className="card">
        {visible.topLevel.map((cat) => (
          <div key={cat.id}>
            <button type="button" className="item-row" onClick={() => setEditing(cat)}>
              <div>
                <div className="item-row-name">
                  {cat.name}
                  {cat.cashflow_class && <span className="badge badge-muted">{cashflowLabel(cat.cashflow_class)}</span>}
                  {cat.taxable && <span className="badge">{cat.income_type ?? 'ต้องเสียภาษี'}</span>}
                </div>
              </div>
            </button>
            {(visible.childrenByParent.get(cat.id) ?? []).map((child) => (
              <button
                key={child.id}
                type="button"
                className="item-row item-row-child"
                onClick={() => setEditing(child)}
              >
                <div>
                  <div className="item-row-name">{child.name}</div>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      {editing && (
        <CategoryFormDialog
          typeId={activeTab}
          parentOptions={accounts.filter((a) => a.type_id === activeTab && a.is_active)}
          initial={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}

function cashflowLabel(cls: string) {
  if (cls === 'fixed') return 'คงที่'
  if (cls === 'variable') return 'แปรผัน'
  if (cls === 'savings') return 'เพื่อการออม'
  return cls
}
