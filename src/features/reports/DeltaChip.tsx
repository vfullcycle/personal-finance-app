import { percentChange } from './period'

// ป้ายเทียบช่วง — ทิศทาง "ดี/แย่" กำหนดตามประเภทบรรทัด ไม่ใช่ auto ตามเครื่องหมายบวก/ลบ
// goodDirection='up': ค่าที่เพิ่มขึ้นคือดี (รายได้/net worth) — goodDirection='down': ค่าที่เพิ่มขึ้นคือแย่ (รายจ่าย)
export function DeltaChip({ current, previous, goodDirection }: { current: number; previous: number; goodDirection: 'up' | 'down' }) {
  const pct = percentChange(current, previous)
  const diff = current - previous

  if (previous === 0) {
    if (diff === 0) return <span className="delta-chip flat">–</span>
    return <span className="delta-chip muted">ใหม่</span>
  }
  if (diff === 0 || pct === null) {
    return <span className="delta-chip flat">–</span>
  }

  const isIncrease = diff > 0
  const isGood = goodDirection === 'up' ? isIncrease : !isIncrease
  const arrow = isIncrease ? '▲' : '▼'

  return <span className={`delta-chip ${isGood ? 'good' : 'bad'}`}>{arrow} {Math.abs(pct).toFixed(1)}%</span>
}
