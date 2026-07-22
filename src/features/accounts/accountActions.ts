import { supabase } from '../../lib/supabase'

export async function archiveAccount(id: string) {
  return supabase
    .from('accounts')
    .update({ is_active: false, archived_at: new Date().toISOString() })
    .eq('id', id)
}

export async function unarchiveAccount(id: string) {
  return supabase.from('accounts').update({ is_active: true, archived_at: null }).eq('id', id)
}

export async function deleteAccountHard(id: string) {
  return supabase.from('accounts').delete().eq('id', id)
}

export function isForeignKeyViolation(error: { code?: string } | null): boolean {
  return error?.code === '23503'
}
