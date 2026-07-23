import type { AccountRow } from '../accounts/useAccounts'

export function CategorySelect({
  id,
  accounts,
  value,
  onChange,
  required,
}: {
  id?: string
  accounts: AccountRow[]
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  const active = accounts.filter((a) => a.is_active)
  const topLevel = active.filter((a) => !a.parent_id)
  const childrenByParent = new Map<string, AccountRow[]>()
  for (const a of active) {
    if (a.parent_id) {
      const list = childrenByParent.get(a.parent_id) ?? []
      list.push(a)
      childrenByParent.set(a.parent_id, list)
    }
  }

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="" disabled>
        เลือกหมวดหมู่
      </option>
      {topLevel.map((cat) => {
        const children = childrenByParent.get(cat.id) ?? []
        if (children.length === 0) {
          return (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          )
        }
        return (
          <optgroup key={cat.id} label={cat.name}>
            <option value={cat.id}>{cat.name} (หมวดหลัก)</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </optgroup>
        )
      })}
    </select>
  )
}
