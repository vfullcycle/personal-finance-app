import { useState } from 'react'
import { formatSatangAsBaht } from '../../lib/money'
import { todayLocalDateString } from '../../lib/date'
import { useSavingsGoals, type SavingsGoalRow } from './useSavingsGoals'
import { SavingsGoalFormDialog } from './SavingsGoalFormDialog'

function monthsUntil(targetDate: string, today: string): number {
  const [ty, tm] = targetDate.split('-').map(Number)
  const [ny, nm] = today.split('-').map(Number)
  return (ty - ny) * 12 + (tm - nm)
}

function GoalCard({ goal, onClick }: { goal: SavingsGoalRow; onClick: () => void }) {
  const progress = goal.target_amount > 0 ? Math.min(1, Math.max(0, goal.currentBalance / goal.target_amount)) : 0
  const remaining = Math.max(0, goal.target_amount - goal.currentBalance)
  const reached = goal.currentBalance >= goal.target_amount

  const today = todayLocalDateString()
  const monthsLeft = goal.target_date ? monthsUntil(goal.target_date, today) : null
  const requiredMonthly = monthsLeft !== null && monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : null

  return (
    <button type="button" className="item-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 8 }} onClick={onClick}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
        <div className="item-row-name">{goal.name}</div>
        <div className="item-row-balance">
          {formatSatangAsBaht(goal.currentBalance)} / {formatSatangAsBaht(goal.target_amount)} บาท
        </div>
      </div>
      <div className="goal-progress-track">
        <div className={`goal-progress-fill${reached ? ' reached' : ''}`} style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="item-row-sub">
        {reached
          ? 'ถึงเป้าหมายแล้ว'
          : goal.target_date
            ? monthsLeft !== null && monthsLeft > 0
              ? `เหลืออีก ${formatSatangAsBaht(remaining)} บาท · ${monthsLeft} เดือนถึงกำหนด (ต้องออมเพิ่ม ~${formatSatangAsBaht(requiredMonthly ?? 0)} บาท/เดือน)`
              : `เหลืออีก ${formatSatangAsBaht(remaining)} บาท · เลยวันที่กำหนดแล้ว`
            : `เหลืออีก ${formatSatangAsBaht(remaining)} บาท`}
      </div>
      <div className="item-row-sub">บัญชี: {goal.accountName}</div>
    </button>
  )
}

export function SavingsGoalsTab() {
  const { goals, loading, error, refresh } = useSavingsGoals()
  const [editing, setEditing] = useState<SavingsGoalRow | 'new' | null>(null)

  const handleSaved = () => {
    setEditing(null)
    refresh()
  }

  return (
    <div>
      <div className="list-header">
        <h2 style={{ margin: 0, fontSize: 18 }}>เป้าหมายการออม</h2>
        <button type="button" className="btn" onClick={() => setEditing('new')}>
          + ตั้งเป้าหมาย
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}
      {!loading && goals.length === 0 && <div className="empty-state">ยังไม่มีเป้าหมายการออม กดปุ่ม + เพื่อเพิ่ม</div>}

      {goals.length > 0 && (
        <div className="card">
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} onClick={() => setEditing(g)} />
          ))}
        </div>
      )}

      {editing && (
        <SavingsGoalFormDialog initial={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
