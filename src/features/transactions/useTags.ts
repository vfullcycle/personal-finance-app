import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import type { Tables } from '../../types/database'

export function useTags() {
  const [tags, setTags] = useState<Tables<'tags'>[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('tags').select('*').order('sort_order')
    setTags(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  // จัดเรียงลำดับใหม่ (orderedIds คือ id ทั้งชุดตามลำดับใหม่ที่ลากได้ — แท็กมี list เดียวไม่มีกลุ่มย่อย)
  const reorder = useCallback(
    async (orderedIds: string[]) => {
      setTags((prev) => {
        const byId = new Map(prev.map((t) => [t.id, t]))
        const sortOrders = orderedIds.map((id) => byId.get(id)?.sort_order ?? 0).sort((a, b) => a - b)
        const nextSortOrderById = new Map(orderedIds.map((id, i) => [id, sortOrders[i]]))
        const next = prev.map((t) => (nextSortOrderById.has(t.id) ? { ...t, sort_order: nextSortOrderById.get(t.id)! } : t))
        return [...next].sort((a, b) => a.sort_order - b.sort_order)
      })

      const byId = new Map(tags.map((t) => [t.id, t]))
      const sortOrders = orderedIds.map((id) => byId.get(id)?.sort_order ?? 0).sort((a, b) => a - b)
      await Promise.all(orderedIds.map((id, i) => supabase.from('tags').update({ sort_order: sortOrders[i] }).eq('id', id)))
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tags],
  )

  return { tags, loading, refresh, reorder }
}
