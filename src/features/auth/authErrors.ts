export function authErrorMessage(message: string): string {
  if (message.includes('Invalid login credentials')) return 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  if (message.includes('Email not confirmed')) return 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ (เช็คกล่องจดหมาย)'
  if (message.includes('User already registered')) return 'อีเมลนี้สมัครสมาชิกไว้แล้ว ลองเข้าสู่ระบบแทน'
  if (message.toLowerCase().includes('password') && message.toLowerCase().includes('character')) {
    return 'รหัสผ่านสั้นเกินไป กรุณาตั้งอย่างน้อย 8 ตัวอักษร'
  }
  if (message.includes('rate limit')) return 'ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'
  return `เกิดข้อผิดพลาด: ${message}`
}
