import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useParticipant } from '../../context/ParticipantContext'
import { EVENT } from '../../lib/event'

export default function PortalLogin() {
  const { login } = useParticipant()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPass, setShowPass] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const res = await login(email, password)
      if (res.ok) navigate('/participant/portal', { replace: true })
      else setError(res.error)
    } catch (err) {
      setError(err?.message || 'Could not connect. Please tell an organiser.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="hero">
      <div className="hero__glow hero__glow--a" />
      <div className="hero__glow hero__glow--b" />
      <div className="hero__grid" />

      <div className="hero__inner">
        <section className="hero__pitch">
          <img
            src="/gna-logo.png"
            alt="GNA University"
            className="hero__logo"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />

          <span className="pill">
            <i className="pill__dot" /> {EVENT.date}
          </span>

          <h1 className="hero__title">
            AI<span>Explore</span>
          </h1>
          <p className="hero__lede">
            Sign in with the credentials emailed to you, choose your team&rsquo;s problem statement,
            and download your official copy.
          </p>

          <ul className="hero__facts">
            <li>
              <strong>{EVENT.reportTime}</strong>
              <span>Reporting time</span>
            </li>
            <li>
              <strong>{EVENT.startTime}</strong>
              <span>Competition start time</span>
            </li>
            <li>
              <strong>1 of 1</strong>
              <span>One statement per team, locked</span>
            </li>
          </ul>
        </section>

        <section className="signin">
          <header className="signin__head">
            <span className="signin__kicker">Participant access</span>
            <h2>Sign in</h2>
          </header>

          <form onSubmit={onSubmit} className="signin__form">
            <div className="field">
              <label htmlFor="p-email">Email ID</label>
              <input
                id="p-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="p-pass">Password</label>
              <div className="input-wrap">
                <input
                  id="p-pass"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password from your email"
                  required
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {error && (
              <p className="signin__error" role="alert">
                {error}
              </p>
            )}

            <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="signin__note">
            Each member signs in with their own credentials. Both of you share one Team ID and one
            problem statement.
          </p>
        </section>
      </div>
    </div>
  )
}
