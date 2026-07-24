import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { authErrorMessage } from './authErrors'
import { CategoriesTab } from '../accounts/CategoriesTab'
import { TagsSettingsTab } from './TagsSettingsTab'
import type { Tables } from '../../types/database'

type SettingsTab = 'profile' | 'categories' | 'tags'

const TABS: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'โปรไฟล์' },
  { id: 'categories', label: 'หมวดหมู่' },
  { id: 'tags', label: 'แท็ก/มิติ' },
]

function ProfileTab() {
  const { user, signOut } = useAuth()
  const [profile, setProfile] = useState<Tables<'profiles'> | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => setProfile(data))
  }, [user])

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }
    if (newPassword.length < 8) {
      setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร')
      return
    }

    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setSubmitting(false)

    if (updateError) {
      setError(authErrorMessage(updateError.message))
      return
    }
    setNewPassword('')
    setConfirmPassword('')
    setSuccess(true)
  }

  return (
    <div>
      <div className="card" style={{ marginTop: 16, marginBottom: 16 }}>
        <h3>Username</h3>
        <p style={{ marginTop: 4 }}>{profile?.username ?? '—'}</p>
        <h3 style={{ marginTop: 16 }}>อีเมลกู้คืนรหัสผ่าน</h3>
        <p style={{ marginTop: 4 }}>{profile?.recovery_email ?? '—'}</p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>เปลี่ยนรหัสผ่าน</h2>
        {error && <div className="banner-error">{error}</div>}
        {success && <div className="banner-info">เปลี่ยนรหัสผ่านสำเร็จ</div>}
        <form onSubmit={handleChangePassword}>
          <div className="field">
            <label htmlFor="newPassword">รหัสผ่านใหม่</label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
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
          <button type="submit" className="btn" disabled={submitting}>
            {submitting ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
          </button>
        </form>
      </div>

      <button type="button" className="btn btn-danger" onClick={signOut}>
        ออกจากระบบ
      </button>
    </div>
  )
}

export function SettingsPage() {
  const [searchParams] = useSearchParams()
  const initialTab = (searchParams.get('tab') as SettingsTab | null) ?? 'profile'
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    TABS.some((t) => t.id === initialTab) ? initialTab : 'profile',
  )

  return (
    <div className="page">
      <div className="list-header">
        <h1>ตั้งค่า</h1>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab${activeTab === t.id ? ' active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && <ProfileTab />}
      {activeTab === 'categories' && <CategoriesTab />}
      {activeTab === 'tags' && <TagsSettingsTab />}
    </div>
  )
}
