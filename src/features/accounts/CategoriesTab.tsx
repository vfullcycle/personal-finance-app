import { useMemo, useState } from 'react'
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAccounts, type AccountRow } from './useAccounts'
import { CategoryFormDialog } from './CategoryFormDialog'
import type { AccountType } from './constants'

const TABS: { id: AccountType; label: string }[] = [
  { id: 'income', label: 'รายได้' },
  { id: 'expense', label: 'ค่าใช้จ่าย' },
  { id: 'equity', label: 'ทุน' },
]

function CategoryRow({ account, isChild, onClick }: { account: AccountRow; isChild?: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="sortable-row">
      <span className="drag-handle" {...attributes} {...listeners}>
        ⠿
      </span>
      <button type="button" className={`item-row${isChild ? ' item-row-child' : ''}`} onClick={onClick}>
        <div>
          <div className="item-row-name">
            {account.name}
            {account.cashflow_class && <span className="badge badge-muted">{cashflowLabel(account.cashflow_class)}</span>}
            {account.taxable && <span className="badge">{account.income_type ?? 'ต้องเสียภาษี'}</span>}
          </div>
        </div>
      </button>
    </div>
  )
}

export function CategoriesTab() {
  const [activeTab, setActiveTab] = useState<AccountType>('income')
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState<AccountRow | 'new' | null>(null)
  const { accounts, loading, error, refresh, reorder } = useAccounts(['income', 'expense', 'equity'])
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

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
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={(e: DragEndEvent) => {
            const { active, over } = e
            if (!over || active.id === over.id) return
            const ids = visible.topLevel.map((a) => a.id)
            const oldIndex = ids.indexOf(String(active.id))
            const newIndex = ids.indexOf(String(over.id))
            reorder(arrayMove(ids, oldIndex, newIndex))
          }}
        >
          <SortableContext items={visible.topLevel.map((a) => a.id)} strategy={verticalListSortingStrategy}>
            {visible.topLevel.map((cat) => {
              const children = visible.childrenByParent.get(cat.id) ?? []
              return (
                <div key={cat.id}>
                  <CategoryRow account={cat} onClick={() => setEditing(cat)} />
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e: DragEndEvent) => {
                      const { active, over } = e
                      if (!over || active.id === over.id) return
                      const ids = children.map((a) => a.id)
                      const oldIndex = ids.indexOf(String(active.id))
                      const newIndex = ids.indexOf(String(over.id))
                      reorder(arrayMove(ids, oldIndex, newIndex))
                    }}
                  >
                    <SortableContext items={children.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                      {children.map((child) => (
                        <CategoryRow key={child.id} account={child} isChild onClick={() => setEditing(child)} />
                      ))}
                    </SortableContext>
                  </DndContext>
                </div>
              )
            })}
          </SortableContext>
        </DndContext>
      </div>

      {editing && (
        <CategoryFormDialog
          typeId={activeTab}
          parentOptions={accounts.filter((a) => a.type_id === activeTab && a.is_active)}
          siblingAccounts={accounts}
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
