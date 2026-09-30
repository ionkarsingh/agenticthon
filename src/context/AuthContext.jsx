import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { verifyAdmin } from '../lib/db'

const AuthContext = createContext(null)
const KEY = 'agenticthon.admin'

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setAdmin(JSON.parse(raw))
    } catch {
      /* ignore */
    }
    setReady(true)
  }, [])

  const value = useMemo(
    () => ({
      admin,
      ready,
      async login(email, password) {
        const found = await verifyAdmin(email, password)
        if (!found) return { ok: false, error: 'Invalid email or password.' }
        setAdmin(found)
        try {
          localStorage.setItem(KEY, JSON.stringify(found))
        } catch {
          /* ignore */
        }
        return { ok: true }
      },
      logout() {
        setAdmin(null)
        try {
          localStorage.removeItem(KEY)
        } catch {
          /* ignore */
        }
      },
    }),
    [admin, ready],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
