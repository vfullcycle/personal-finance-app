// เงินเก็บเป็นสตางค์ (bigint) ใน DB — ห้ามใช้ float ตรงๆ กันปัดเศษ (REQUIREMENTS §2)

export function bahtToSatang(baht: string): number {
  const cleaned = baht.replace(/,/g, '').trim()
  const value = Number.parseFloat(cleaned || '0')
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 100)
}

export function satangToBaht(satang: number): number {
  return satang / 100
}

export function formatSatangAsBaht(satang: number): string {
  return satangToBaht(satang).toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
