import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useTags } from './useTags'

export function TagPicker({ selected, onChange }: { selected: string[]; onChange: (tagIds: string[]) => void }) {
  const { user } = useAuth()
  const { tags, refresh } = useTags()
  const [newTagName, setNewTagName] = useState('')
  const [creating, setCreating] = useState(false)

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id])
  }

  const handleCreate = async () => {
    const name = newTagName.trim()
    if (!name || !user) return

    const existing = tags.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (existing) {
      setNewTagName('')
      if (!selected.includes(existing.id)) onChange([...selected, existing.id])
      return
    }

    setCreating(true)
    const { data } = await supabase.from('tags').insert({ user_id: user.id, name }).select().single()
    setCreating(false)
    if (data) {
      setNewTagName('')
      await refresh()
      onChange([...selected, data.id])
    }
  }

  return (
    <div className="field">
      <label>แท็ก/มิติ (ถ้ามี)</label>
      {tags.length > 0 && (
        <div className="radio-group">
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`radio-chip${selected.includes(t.id) ? ' active' : ''}`}
              onClick={() => toggle(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          placeholder="เพิ่มแท็กใหม่ เช่น ทริปเชียงใหม่"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
        />
        <button type="button" className="btn-secondary btn" disabled={creating || !newTagName.trim()} onClick={handleCreate}>
          เพิ่ม
        </button>
      </div>
    </div>
  )
}
