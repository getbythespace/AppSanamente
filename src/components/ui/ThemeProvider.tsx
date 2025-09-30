import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark'
type Ctx = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
  mounted: boolean
}

const ThemeCtx = createContext<Ctx>({
  theme: 'light',
  setTheme: () => {},
  toggle: () => {},
  mounted: false,
})

function applyTheme(t: Theme) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (t === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  root.style.colorScheme = t
}

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem('theme') as Theme | null
  if (saved) return saved
  const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefers ? 'dark' : 'light'
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // al montar: lee preferencia y aplica
  useEffect(() => {
    const initial = getInitialTheme()
    setThemeState(initial)
    applyTheme(initial)
    setMounted(true)

    // sincroniza entre pestañas
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'theme' && (e.newValue === 'dark' || e.newValue === 'light')) {
        setThemeState(e.newValue)
        applyTheme(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setTheme = (t: Theme) => {
    window.localStorage.setItem('theme', t)
    setThemeState(t)
    applyTheme(t)
  }
  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  const value = useMemo<Ctx>(() => ({ theme, setTheme, toggle, mounted }), [theme, mounted])

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>
}

export function useTheme() {
  return useContext(ThemeCtx)
}
