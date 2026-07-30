import { useState } from 'react'
import { BudgetItemsTab } from './BudgetItemsTab'
import { ProjectionTab } from './ProjectionTab'

type BudgetTab = 'items' | 'projection'

const TABS: { id: BudgetTab; label: string }[] = [
  { id: 'items', label: 'รายการงบประมาณ' },
  { id: 'projection', label: 'คาดการณ์' },
]

export function BudgetPage() {
  const [activeTab, setActiveTab] = useState<BudgetTab>('items')

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

      {activeTab === 'items' && <BudgetItemsTab />}
      {activeTab === 'projection' && <ProjectionTab />}
    </div>
  )
}
