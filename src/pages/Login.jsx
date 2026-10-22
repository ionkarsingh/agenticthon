import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isFirebaseConfigured } from '../firebase'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await login(email, password)
      if (res.ok) navigate('/admin/dashboard', { replace: true })
      else setError(res.error)
    } catch (err) {
      setError(err?.message || 'Could not reach Firestore. Check your Firebase config.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="login">
      <div className="login__card">
        <div className="login__brand">
          <div className="brand__mark">A</div>
          <div>
            <div className="brand__name">AIExplore</div>
            <div className="brand__sub">Admin Console</div>
          </div>
        </div>

        <h1>Sign in</h1>
        <p>Organiser access to problem statements and team accounts.</p>

        {!isFirebaseConfigured && (
          <div className="banner">
            Firebase is not configured yet. Copy <code>.env.example</code> to <code>.env</code> and fill in
            your Firebase web config, then restart the dev server.
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email ID</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="error-text">{error}</p>}

          <button className="btn btn--primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="login__foot">AIExplore · LLM&rsquo;s · Gen AI · AI Agent</div>
      </div>
    </div>
  )
}
