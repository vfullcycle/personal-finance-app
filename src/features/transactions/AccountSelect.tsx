import type { AccountRow } from '../accounts/useAccounts'

export function AccountSelect({
  id,
  accounts,
  value,
  onChange,
  required,
  placeholder = 'เลือกบัญชี',
}: {
  id?: string
  accounts: AccountRow[]
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
}) {
  const active = accounts.filter((a) => a.is_active)

  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="" disabled>
        {placeholder}
      </option>
      {active.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
          {a.subtype === 'credit_card' ? ' (บัตรเครดิต)' : ''}
        </option>
      ))}
    </select>
  )
}
