// event bus เบาๆ ให้หน้า/ฮุกที่ fetch รายการ (useTransactions) รีเฟรชอัตโนมัติ
// เมื่อมีการบันทึก/ลบรายการจากที่ไหนก็ได้ (FAB กลางใน AppShell, ฟอร์มแก้ไขในหน้ารายการ, auto-post ของรายการประจำ)
const EVENT_NAME = 'pfa:transactions-changed'

export function emitTransactionsChanged() {
  window.dispatchEvent(new Event(EVENT_NAME))
}

export function onTransactionsChanged(handler: () => void) {
  window.addEventListener(EVENT_NAME, handler)
  return () => window.removeEventListener(EVENT_NAME, handler)
}
