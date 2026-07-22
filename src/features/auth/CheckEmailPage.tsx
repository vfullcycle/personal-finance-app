import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

export function CheckEmailPage() {
  const location = useLocation()
  const state = location.state as { loginEmail?: string; recoveryEmail?: string } | null
  const loginEmail = state?.loginEmail
  const recoveryEmail = state?.recoveryEmail
  const [resent, setResent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleResend = async () => {
    if (!loginEmail) return
    setSubmitting(true)
    await supabase.auth.resend({ type: 'signup', email: loginEmail })
    setSubmitting(false)
    setResent(true)
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h1>ยืนยันอีเมลของคุณ</h1>
        <p className="field-hint" style={{ margin: '12px 0 20px' }}>
          เราส่งลิงก์ยืนยันไปที่ {recoveryEmail ? <strong>{recoveryEmail}</strong> : 'อีเมลกู้คืนที่กรอกไว้'} แล้ว
          กรุณาเปิดอีเมลและกดลิงก์เพื่อเริ่มใช้งาน
        </p>

        {resent && <div className="banner-info">ส่งอีเมลยืนยันอีกครั้งแล้ว</div>}

        {loginEmail && (
          <button type="button" className="btn btn-secondary btn-block" onClick={handleResend} disabled={submitting}>
            {submitting ? 'กำลังส่ง...' : 'ส่งอีเมลยืนยันอีกครั้ง'}
          </button>
        )}

        <p className="field-hint" style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/login">กลับไปหน้าเข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  )
}
