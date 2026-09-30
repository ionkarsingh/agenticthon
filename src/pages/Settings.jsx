import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { isFirebaseConfigured } from '../firebase'
import { ADMIN_URL, PARTICIPANT_URL, isSiteUrlPinned } from '../lib/config'

export default function Settings() {
  const { admin, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [confirmOut, setConfirmOut] = useState(false)
  const [mail, setMail] = useState(null)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then(setMail)
      .catch(() => setMail({ ok: false, smtp: false }))
  }, [])

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Settings</h1>
          <p>Account and service status.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>Signed in as</h3>
        <dl className="kv">
          <dt>Name</dt>
          <dd>{admin?.name || 'Admin'}</dd>
          <dt>Email ID</dt>
          <dd>{admin?.email}</dd>
          <dt>Role</dt>
          <dd><span className="badge">Organiser / Admin</span></dd>
        </dl>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>Services</h3>
        <dl className="kv">
          <dt>Firestore</dt>
          <dd>
            <span className={`badge ${isFirebaseConfigured ? 'badge--free' : 'badge--locked'}`}>
              {isFirebaseConfigured ? 'Configured' : 'Missing .env config'}
            </span>
          </dd>
          <dt>SMTP / nodemailer</dt>
          <dd>
            <span className={`badge ${mail?.smtp ? 'badge--free' : 'badge--locked'}`}>
              {mail === null ? 'Checking…' : mail.smtp ? 'Configured' : 'Not configured'}
            </span>
          </dd>
        </dl>
        <p className="hint" style={{ marginTop: 14 }}>
          Both are read from environment variables — <code>.env</code> locally, Project Settings on Vercel.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, marginBottom: 14 }}>Portal links</h3>
        <dl className="kv">
          <dt>Participant portal</dt>
          <dd>
            <code>{PARTICIPANT_URL()}</code>
            <button
              className="btn btn--ghost btn--sm"
              style={{ marginLeft: 10 }}
              onClick={() => {
                navigator.clipboard?.writeText(PARTICIPANT_URL())
                toast.success('Participant URL copied.')
              }}
            >
              Copy
            </button>
          </dd>
          <dt>Admin console</dt>
          <dd><code>{ADMIN_URL()}</code></dd>
          <dt>Source</dt>
          <dd>
            <span className={`badge ${isSiteUrlPinned ? 'badge--free' : ''}`}>
              {isSiteUrlPinned ? 'Pinned by VITE_SITE_URL' : 'Auto-detected from browser'}
            </span>
          </dd>
        </dl>
        <p className="hint" style={{ marginTop: 14 }}>
          This is the link to put in the QR code you share on the morning of the event. It follows
          whatever domain the app is served from — set <code>VITE_SITE_URL</code> on Vercel only if
          you want to pin one domain.
        </p>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 15, marginBottom: 6 }}>Session</h3>
        <p className="hint" style={{ marginBottom: 14 }}>End this admin session on this browser.</p>
        <button className="btn btn--danger" onClick={() => setConfirmOut(true)}>Log out</button>
      </div>

      <ConfirmDialog
        open={confirmOut}
        title="Log out?"
        message="You will be returned to the sign-in screen."
        confirmLabel="Log out"
        tone="danger"
        onCancel={() => setConfirmOut(false)}
        onConfirm={() => {
          logout()
          toast.info('Signed out.')
          navigate('/admin/login', { replace: true })
        }}
      />
    </>
  )
}
