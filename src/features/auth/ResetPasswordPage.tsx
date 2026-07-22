import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from './authErrors'
import { useAuth } from '../../context/AuthContext'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }
    if (password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }

    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (updateError) {
      setError(authErrorMessage(updateError.message))
      return
    }
    setDone(true)
  }

  if (loading) {
    return <div className="auth-page" />
  }

  if (done) {
    return (
      <div className="auth-page">
        <div className="auth-card card">
          <h1>ตั้งรหัสผ่านใหม่สำเร็จ</h1>
          <p className="field-hint" style={{ margin: '12px 0 20px' }}>
            ใช้รหัสผ่านใหม่เข้าสู่ระบบได้ทันที
          </p>
          <button type="button" className="btn btn-block" onClick={() => navigate('/accounts')}>
            ไปที่หน้าบัญชี
          </button>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="auth-page">
        <div className="auth-card card">
          <h1>ลิงก์หมดอายุหรือไม่ถูกต้อง</h1>
          <p className="field-hint" style={{ margin: '12px 0 20px' }}>
            กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่อีกครั้ง
          </p>
          <Link to="/forgot-password" className="btn btn-block" style={{ textDecoration: 'none' }}>
            ขอลิงก์ใหม่
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h1>ตั้งรหัสผ่านใหม่</h1>
        {error && <div className="banner-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="password">รหัสผ่านใหม่</label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="field-hint">อย่างน้อย 8 ตัวอักษร</span>
          </div>
          <div className="field">
            <label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-block" disabled={submitting}>
            {submitting ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
          </button>
        </form>
      </div>
    </div>
  )
}
