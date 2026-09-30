import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { verifyParticipant } from '../lib/db'

const ParticipantContext = createContext(null)
const KEY = 'agenticthon.participant'

export function ParticipantProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      /* ignore */
    }
    setReady(true)
  }, [])

  const value = useMemo(
    () => ({
      user,
      ready,
      async login(email, password) {
        const found = await verifyParticipant(email, password)
        if (!found) return { ok: false, error: 'Invalid email or password.' }
        setUser(found)
        try {
          localStorage.setItem(KEY, JSON.stringify(found))
        } catch {
          /* ignore */
        }
        return { ok: true }
      },
      logout() {
        setUser(null)
        try {
          localStorage.removeItem(KEY)
        } catch {
          /* ignore */
        }
      },
    }),
    [user, ready],
  )

  return <ParticipantContext.Provider value={value}>{children}</ParticipantContext.Provider>
}

export const useParticipant = () => useContext(ParticipantContext)
