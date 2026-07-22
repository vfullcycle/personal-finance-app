// เข้าระบบด้วย username: แปลง "อีเมลกู้คืน" เป็น "อีเมล login" ด้วย plus-addressing
// เช่น wee@gmail.com + username "wee123" -> wee+wee123@gmail.com
// Gmail/Outlook/iCloud ส่งเมลที่มี +tag เข้ากล่องจดหมายเดิมอัตโนมัติ

export function buildLoginEmail(recoveryEmail: string, username: string): string {
  const [local, domain] = recoveryEmail.trim().split('@')
  const baseLocal = local.split('+')[0]
  return `${baseLocal}+${username}@${domain}`
}

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
