import { useState } from 'react'
import { Modal } from '../../components/Modal'
import { TransactionFormDialog } from './TransactionFormDialog'
import { FLOW_LABEL, type FlowType } from './types'

const FLOWS: FlowType[] = ['income', 'expense', 'transfer']

export function AddTransactionFab() {
  const [step, setStep] = useState<'closed' | 'pick' | FlowType>('closed')

  return (
    <>
      <button type="button" className="fab" aria-label="เพิ่มรายการ" onClick={() => setStep('pick')}>
        +
      </button>

      {step === 'pick' && (
        <Modal title="เพิ่มรายการ" onClose={() => setStep('closed')}>
          <div className="flow-picker">
            {FLOWS.map((f) => (
              <button key={f} type="button" className="btn btn-block flow-picker-btn" onClick={() => setStep(f)}>
                {FLOW_LABEL[f]}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {step !== 'closed' && step !== 'pick' && (
        <TransactionFormDialog flow={step} initial={null} onClose={() => setStep('closed')} onSaved={() => setStep('closed')} />
      )}
    </>
  )
}
