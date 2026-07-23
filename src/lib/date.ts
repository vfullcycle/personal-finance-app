// แปลง Date -> string วันที่ตามปฏิทินท้องถิ่น (YYYY-MM-DD)
// ห้ามใช้ toISOString().slice(0, 10) ตรงๆ เพราะ toISOString() แปลงเป็น UTC ก่อนเสมอ
// timezone ที่เร็วกว่า UTC (เช่นไทย +7) เที่ยงคืนท้องถิ่นจะกลายเป็น "เมื่อวาน" ใน UTC ทำให้วันที่เพี้ยน
export function toLocalDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function todayLocalDateString(): string {
  return toLocalDateString(new Date())
}

// บวกจำนวนเดือนเข้ากับวันที่ (YYYY-MM-DD) ด้วยเลขจำนวนเต็มล้วน ไม่ผ่าน Date + toISOString()
// ถ้าวันที่ปลายทางเกินจำนวนวันในเดือนนั้น (เช่น 31 ม.ค. + 1 เดือน) จะปรับให้เป็นวันสุดท้ายของเดือน
export function addMonths(dateIso: string, months: number): string {
  const [year, month, day] = dateIso.split('-').map(Number)
  const totalMonths = year * 12 + (month - 1) + months
  const newYear = Math.floor(totalMonths / 12)
  const newMonthIndex = totalMonths % 12 // 0-indexed (0 = มกราคม)

  const daysInNewMonth = new Date(newYear, newMonthIndex + 1, 0).getDate()
  const newDay = Math.min(day, daysInNewMonth)

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${newYear}-${pad(newMonthIndex + 1)}-${pad(newDay)}`
}
