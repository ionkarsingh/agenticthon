import { useEffect, useState } from 'react'
import Modal, { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import { addAdmin, deleteAdmin, listAdmins } from '../lib/db'

const blankAdmin = () => ({ name: '', email: '', password: '' })

export default function Admins() {
  const { admin } = useAuth()
  const toast = useToast()

  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal] = useState(false)
  const [form, setForm] = useState(blankAdmin())
  const [confirmAdd, setConfirmAdd] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const refresh = () => listAdmins().then(setAdmins).finally(() => setLoading(false))

  useEffect(() => {
    refresh()
  }, [])

  const formValid = form.email.trim() && form.password.trim()

  async function submitAddAdmin() {
    setBusy(true)
    try {
      await addAdmin(form)
      toast.success('Admin added.')
      setConfirmAdd(false)
      setAddModal(false)
      setForm(blankAdmin())
      refresh()
    } catch {
      toast.error('Could not add admin.')
    } finally {
      setBusy(false)
    }
  }

  async function confirmDeleteAdmin() {
    setBusy(true)
    try {
      await deleteAdmin(deleteTarget.id)
      toast.success('Admin removed.')
      setDeleteTarget(null)
      refresh()
    } catch {
      toast.error('Could not remove admin.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Admin Management</h1>
          <p>Accounts that can sign in to this console.</p>
        </div>
        <button className="icon-btn icon-btn--lg" onClick={() => setAddModal(true)} aria-label="Add admin" title="Add admin">
          +
        </button>
      </div>

      <div className="card">
        {loading ? (
          <p className="hint">Loading…</p>
        ) : admins.length === 0 ? (
          <p className="hint">No admin accounts yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id}>
                  <td>{a.name || 'Admin'}</td>
                  <td>{a.email}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn--ghost btn--sm"
                      disabled={a.email === admin?.email}
                      onClick={() => setDeleteTarget(a)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={addModal}
        title="Add admin"
        subtitle="They will sign in with this email and password."
        onClose={() => setAddModal(false)}
        width={420}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setAddModal(false)} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn--primary" onClick={() => setConfirmAdd(true)} disabled={!formValid || busy}>
              Add
            </button>
          </>
        }
      >
        <div className="field">
          <label htmlFor="admin-name">Name</label>
          <input
            id="admin-name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Admin"
          />
        </div>
        <div className="field">
          <label htmlFor="admin-email">Email ID</label>
          <input
            id="admin-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
          />
        </div>
        <div className="field">
          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmAdd}
        title="Add this admin?"
        message={`${form.email} will be able to sign in to the admin console with the password you entered.`}
        confirmLabel="Add admin"
        busy={busy}
        onCancel={() => setConfirmAdd(false)}
        onConfirm={submitAddAdmin}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Remove admin?"
        message={`${deleteTarget?.email} will no longer be able to sign in.`}
        confirmLabel="Remove"
        tone="danger"
        busy={busy}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteAdmin}
      />
    </>
  )
}
