import { useState } from 'react'
import { useAnalysisData } from './useAnalysisData'
import { RatiosTab } from './RatiosTab'
import { DecisionToolsTab } from './DecisionToolsTab'
import { SavingsGoalsTab } from './SavingsGoalsTab'

type AnalysisTab = 'ratios' | 'tools' | 'goals'

const TABS: { id: AnalysisTab; label: string }[] = [
  { id: 'ratios', label: 'อัตราส่วนการเงิน' },
  { id: 'tools', label: 'เครื่องมือช่วยตัดสินใจ' },
  { id: 'goals', label: 'เป้าหมายการออม' },
]

export function AnalysisPage() {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('ratios')
  const { figures, loading, error } = useAnalysisData()

  return (
    <div className="page">
      <div className="list-header">
        <h1>วิเคราะห์</h1>
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

      {error && <div className="banner-error">{error}</div>}

      {activeTab === 'goals' ? (
        <SavingsGoalsTab />
      ) : loading ? (
        <div className="empty-state">กำลังโหลด...</div>
      ) : (
        <>
          {activeTab === 'ratios' && <RatiosTab figures={figures} />}
          {activeTab === 'tools' && <DecisionToolsTab figures={figures} />}
        </>
      )}
    </div>
  )
}
