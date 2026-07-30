import { useEffect, useState } from 'react'
import { useAvailableTaxYears, useTaxConfig } from './useTaxConfig'
import { useTaxableIncome } from './useTaxableIncome'
import { useTaxReturn } from './useTaxReturn'
import { useTaxReturnDeductions } from './useTaxReturnDeductions'
import { useWithholding } from './useWithholding'
import { useIsAdmin } from './useIsAdmin'
import { TaxSummaryTab } from './TaxSummaryTab'
import { DeductionsTab } from './DeductionsTab'
import { WithholdingTab } from './WithholdingTab'
import { WhatIfTab } from './WhatIfTab'
import { TaxSettingsTab } from './TaxSettingsTab'

type TaxTab = 'summary' | 'deductions' | 'withholding' | 'whatif' | 'settings'

const TABS: { id: TaxTab; label: string }[] = [
  { id: 'summary', label: 'สรุปภาษี' },
  { id: 'deductions', label: 'ค่าลดหย่อน' },
  { id: 'withholding', label: 'ภาษีหัก ณ ที่จ่าย' },
  { id: 'whatif', label: 'What-if' },
  { id: 'settings', label: 'ตั้งค่าภาษี' },
]

export function TaxPage() {
  const availableYears = useAvailableTaxYears()
  const [taxYear, setTaxYear] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<TaxTab>('summary')
  const isAdmin = useIsAdmin()

  useEffect(() => {
    if (taxYear === null && availableYears.length > 0) setTaxYear(availableYears[0])
  }, [availableYears, taxYear])

  const { config, loading: configLoading, error: configError, refresh: refreshConfig } = useTaxConfig(taxYear)
  const { incomeByType, loading: incomeLoading } = useTaxableIncome(taxYear)
  const { header, loading: headerLoading, save: saveHeader } = useTaxReturn(taxYear)
  const { entries, projectionFlags, loading: entriesLoading, saveItem } = useTaxReturnDeductions(taxYear)
  const withholding = useWithholding(taxYear)

  const loading = configLoading || incomeLoading || headerLoading || entriesLoading

  return (
    <div className="page">
      <div className="list-header">
        <h1>ภาษี</h1>
        {availableYears.length > 0 && (
          <select value={taxYear ?? ''} onChange={(e) => setTaxYear(Number(e.target.value))}>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                ปีภาษี {y}
              </option>
            ))}
          </select>
        )}
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

      {configError && <div className="banner-error">{configError}</div>}

      {!config || loading ? (
        <div className="empty-state">กำลังโหลด...</div>
      ) : (
        <>
          {activeTab === 'summary' && (
            <TaxSummaryTab
              incomeByType={incomeByType}
              config={config}
              header={header}
              deductionEntries={entries}
              totalWithholding={withholding.total}
            />
          )}
          {activeTab === 'deductions' && (
            <DeductionsTab
              config={config}
              incomeByType={incomeByType}
              header={header}
              entries={entries}
              projectionFlags={projectionFlags}
              saveHeader={saveHeader}
              saveEntry={saveItem}
            />
          )}
          {activeTab === 'withholding' && (
            <WithholdingTab
              entries={withholding.entries}
              total={withholding.total}
              loading={withholding.loading}
              add={withholding.add}
              remove={withholding.remove}
              header={header}
              saveHeader={saveHeader}
            />
          )}
          {activeTab === 'whatif' && (
            <WhatIfTab
              incomeByType={incomeByType}
              config={config}
              header={header}
              deductionEntries={entries}
              totalWithholding={withholding.total}
            />
          )}
          {activeTab === 'settings' && taxYear && (
            <TaxSettingsTab
              taxYear={taxYear}
              config={config}
              isAdmin={isAdmin}
              incomeByType={incomeByType}
              header={header}
              deductionEntries={entries}
              totalWithholding={withholding.total}
              onSaved={refreshConfig}
            />
          )}
        </>
      )}
    </div>
  )
}
