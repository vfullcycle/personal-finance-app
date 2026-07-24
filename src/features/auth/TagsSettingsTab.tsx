import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useTags } from '../transactions/useTags'
import type { Tables } from '../../types/database'

export function TagsSettingsTab() {
  const { user } = useAuth()
  const { tags, loading, refresh } = useTags()
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [newTagName, setNewTagName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    supabase
      .from('transaction_tags')
      .select('tag_id')
      .then(({ data }) => {
        const next: Record<string, number> = {}
        for (const row of (data ?? []) as { tag_id: string }[]) {
          next[row.tag_id] = (next[row.tag_id] ?? 0) + 1
        }
        setCounts(next)
      })
  }, [tags])

  const handleCreate = async () => {
    const name = newTagName.trim()
    if (!name || !user) return
    if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      setError('มีแท็กชื่อนี้อยู่แล้ว')
      return
    }

    setSubmitting(true)
    setError(null)
    const { error: createError } = await supabase.from('tags').insert({ user_id: user.id, name })
    setSubmitting(false)
    if (createError) {
      setError(createError.message)
      return
    }
    setNewTagName('')
    refresh()
  }

  const startRename = (tag: Tables<'tags'>) => {
    setEditingId(tag.id)
    setRenameValue(tag.name)
    setError(null)
  }

  const handleRename = async () => {
    const name = renameValue.trim()
    if (!editingId || !name) return
    if (tags.some((t) => t.id !== editingId && t.name.toLowerCase() === name.toLowerCase())) {
      setError('มีแท็กชื่อนี้อยู่แล้ว')
      return
    }

    setSubmitting(true)
    setError(null)
    const { error: updateError } = await supabase.from('tags').update({ name }).eq('id', editingId)
    setSubmitting(false)
    if (updateError) {
      setError(updateError.message)
      return
    }
    setEditingId(null)
    refresh()
  }

  const handleDelete = async (tag: Tables<'tags'>) => {
    const count = counts[tag.id] ?? 0
    const message =
      count > 0
        ? `ลบแท็ก "${tag.name}"? จะเลิกผูกออกจาก ${count} รายการที่ใช้แท็กนี้อยู่ (ตัวรายการไม่หาย แค่ไม่มีแท็กนี้แล้ว)`
        : `ลบแท็ก "${tag.name}"?`
    if (!confirm(message)) return

    setError(null)
    const { error: deleteError } = await supabase.from('tags').delete().eq('id', tag.id)
    if (deleteError) {
      setError(deleteError.message)
      return
    }
    refresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          placeholder="เพิ่มแท็กใหม่ เช่น ทริปเชียงใหม่"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
        />
        <button type="button" className="btn" disabled={submitting || !newTagName.trim()} onClick={handleCreate}>
          + เพิ่มแท็ก
        </button>
      </div>

      {error && <div className="banner-error">{error}</div>}

      {!loading && tags.length === 0 && <div className="empty-state">ยังไม่มีแท็ก เพิ่มแท็กแรกด้านบนได้เลย</div>}

      {tags.length > 0 && (
        <div className="card">
          {tags.map((tag) => (
            <div key={tag.id} className="item-row" style={{ cursor: 'default' }}>
              {editingId === tag.id ? (
                <div style={{ display: 'flex', gap: 8, flex: 1 }}>
                  <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus />
                  <button type="button" className="btn" disabled={submitting || !renameValue.trim()} onClick={handleRename}>
                    บันทึก
                  </button>
                  <button type="button" className="btn-secondary btn" onClick={() => setEditingId(null)}>
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="item-row-name">{tag.name}</div>
                    <div className="item-row-sub">{counts[tag.id] ?? 0} รายการ</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" className="btn-secondary btn" onClick={() => startRename(tag)}>
                      แก้ชื่อ
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => handleDelete(tag)}>
                      ลบ
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
