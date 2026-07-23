import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from './authErrors'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/transactions'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { data: loginEmail, error: lookupError } = await supabase.rpc('get_login_email', {
      p_username: username,
    })

    if (lookupError || !loginEmail) {
      setSubmitting(false)
      setError('username หรือรหัสผ่านไม่ถูกต้อง')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })
    setSubmitting(false)

    if (signInError) {
      setError(authErrorMessage(signInError.message))
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <h1>เข้าสู่ระบบ</h1>
        <p className="field-hint" style={{ marginBottom: 20 }}>
          บริหารการเงินส่วนบุคคล
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
          <div className="field">
            <label htmlFor="password">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-block" disabled={submitting}>
            {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="field-hint" style={{ marginTop: 20, textAlign: 'center' }}>
          <Link to="/forgot-password">ลืมรหัสผ่าน?</Link>
        </p>
        <p className="field-hint" style={{ marginTop: 8, textAlign: 'center' }}>
          ยังไม่มีบัญชี? <Link to="/signup">สมัครสมาชิก</Link>
        </p>
      </div>
    </div>
  )
}
