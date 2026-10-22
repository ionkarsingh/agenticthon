import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useParticipant } from '../context/ParticipantContext'
import { ConfirmDialog } from './Modal'
import { EVENT } from '../lib/event'

export default function PortalLayout() {
  const { user, logout } = useParticipant()
  const navigate = useNavigate()
  const [confirmOut, setConfirmOut] = useState(false)

  return (
    <div className="portal">
      <header className="portal__bar">
        <div className="portal__brand" onClick={() => navigate('/participant/portal')}>
          <div className="brand__mark">A</div>
          <div>
            <div className="brand__name">{EVENT.name}</div>
            <div className="brand__sub">Participant Portal</div>
          </div>
        </div>

        <div className="portal__who">
          <div className="portal__who-text">
            <strong>{user?.teamCode}</strong>
            <span>{user?.email}</span>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={() => setConfirmOut(true)}>
            Log out
          </button>
        </div>
      </header>

      <main className="portal__main">
        <Outlet />
      </main>

      <footer className="portal__foot">
        {EVENT.name} · {EVENT.date} · venue &amp; start time {EVENT.venue}
      </footer>

      <ConfirmDialog
        open={confirmOut}
        title="Log out?"
        message="Are you sure you want to log out? You can sign in again with the same credentials — your team's locked problem statement is not affected."
        confirmLabel="Yes, log out"
        tone="danger"
        onCancel={() => setConfirmOut(false)}
        onConfirm={() => {
          logout()
          navigate('/participant/login', { replace: true })
        }}
      />
    </div>
  )
}
