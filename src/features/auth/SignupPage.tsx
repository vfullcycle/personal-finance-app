import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from './authErrors'
import { buildLoginEmail, EMAIL_PATTERN, USERNAME_PATTERN } from '../../lib/emailTag'

export function SignupPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!USERNAME_PATTERN.test(username)) {
      setError('username ต้องเป็นตัวอักษรอังกฤษ/ตัวเลข/_ ความยาว 3-20 ตัว')
      return
    }
    if (!EMAIL_PATTERN.test(recoveryEmail)) {
      setError('รูปแบบอีเมลกู้คืนไม่ถูกต้อง')
      return
    }
    if (password !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }
    if (password.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }

    setSubmitting(true)

    const { data: available, error: checkError } = await supabase.rpc('is_username_available', {
      p_username: username,
    })
    if (checkError) {
      setSubmitting(false)
      setError(authErrorMessage(checkError.message))
      return
    }
    if (!available) {
      setSubmitting(false)
      setError('username นี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่น')
      return
    }

    const loginEmail = buildLoginEmail(recoveryEmail, username)
    const { error: signUpError } = await supabase.auth.signUp({
      email: loginEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { username, recovery_email: recoveryEmail },
      },
    })
    setSubmitting(false)

    if (signUpError) {
      setError(authErrorMessage(signUpError.message))
      return
    }

    navigate('/check-email', { state: { loginEmail, recoveryEmail } })
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h1>สมัครสมาชิก</h1>
        <p className="field-hint" style={{ marginBottom: 20 }}>
          เริ่มบริหารการเงินส่วนบุคคลของคุณ
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
              placeholder="เช่น wee123"
            />
            <span className="field-hint">ตัวอักษรอังกฤษ/ตัวเลข/_ 3-20 ตัว ใช้เข้าสู่ระบบ</span>
          </div>
          <div className="field">
            <label htmlFor="recoveryEmail">อีเมลสำหรับกู้คืนรหัสผ่าน</label>
            <input
              id="recoveryEmail"
              type="email"
              autoComplete="email"
              required
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
            />
            <span className="field-hint">ใช้ตอนลืมรหัสผ่านเท่านั้น ไม่ใช้เข้าสู่ระบบ</span>
          </div>
          <div className="field">
            <label htmlFor="password">รหัสผ่าน</label>
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
            <label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</label>
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
            {submitting ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
          </button>
        </form>

        <p className="field-hint" style={{ marginTop: 20, textAlign: 'center' }}>
          มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  )
}
