import { useState } from 'react'
import { BaselineTab } from './BaselineTab'
import { ScheduleTab } from './ScheduleTab'

type BudgetTab = 'baseline' | 'schedule'

const TABS: { id: BudgetTab; label: string }[] = [
  { id: 'baseline', label: 'งบประจำ' },
  { id: 'schedule', label: 'แผนกำหนดการ' },
]

export function BudgetPage() {
  const [activeTab, setActiveTab] = useState<BudgetTab>('baseline')

  return (
    <div className="page">
      <div className="list-header">
        <h1>งบประมาณ</h1>
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

      {activeTab === 'baseline' && <BaselineTab />}
      {activeTab === 'schedule' && <ScheduleTab />}
    </div>
  )
}
