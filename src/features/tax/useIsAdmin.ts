import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

// เช็คว่า user ปัจจุบันคือ username "admin" หรือไม่ — คนเดียวที่แก้ tax config กลางได้ (บังคับจริงที่ RLS ผ่าน is_admin() ในฝั่ง DB แล้ว
// hook นี้ใช้แค่ซ่อน/แสดงปุ่มบันทึกฝั่ง UI เท่านั้น)
export function useIsAdmin() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      return
    }
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(!!data))
  }, [user])

  return isAdmin
}
