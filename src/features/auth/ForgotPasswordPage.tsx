import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from './authErrors'

export function ForgotPasswordPage() {
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { data: loginEmail } = await supabase.rpc('get_login_email', { p_username: username })

    if (loginEmail) {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(loginEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) {
        setSubmitting(false)
        setError(authErrorMessage(resetError.message))
        return
      }
    }

    // แสดงข้อความเดียวกันไม่ว่าจะเจอ username หรือไม่ กัน enumeration
    setSubmitting(false)
    setSent(true)
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h1>ลืมรหัสผ่าน</h1>

        {sent ? (
          <div className="banner-info">
            ถ้า username นี้มีอยู่ในระบบ เราส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปที่อีเมลกู้คืนที่ผูกไว้แล้ว กรุณาเช็คกล่องจดหมาย
          </div>
        ) : (
          <>
            <p className="field-hint" style={{ marginBottom: 20 }}>
              กรอก username เราจะส่งลิงก์ไปที่อีเมลกู้คืนที่ผูกไว้ตอนสมัคร
            </p>
            {error && <div className="banner-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <button type="submit" className="btn btn-block" disabled={submitting}>
                {submitting ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ตรหัสผ่าน'}
              </button>
            </form>
          </>
        )}

        <p className="field-hint" style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/login">กลับไปหน้าเข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  )
}
