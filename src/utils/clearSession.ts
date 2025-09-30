import { supabase } from '@/lib/db'

export async function clearSession() {
  try {
    // 1. Cerrar sesión en Supabase
    await supabase.auth.signOut()
    
    // 2. Limpiar local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('supabase.auth.token')
      localStorage.removeItem('lastActiveRole')
      sessionStorage.clear()
    }
    
    // 3. Limpiar cookies
    const pastDate = 'Thu, 01 Jan 1970 00:00:00 UTC'
    document.cookie = `sb-access-token=; expires=${pastDate}; path=/;`
    document.cookie = `sb-refresh-token=; expires=${pastDate}; path=/;`
    document.cookie = `active-role=; expires=${pastDate}; path=/;`
    
    // 4. Notificar al servidor
    await fetch('/api/auth/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ event: 'SIGNED_OUT' }),
    })
    
    console.log('Sesión limpiada correctamente')
    return true
  } catch (error) {
    console.error('Error al limpiar sesión:', error)
    return false
  }
}