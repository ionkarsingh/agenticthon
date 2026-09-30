import { useEffect, useMemo, useState } from 'react'
import Modal, { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'
import { randomPassword, sendCredentialEmail } from '../lib/email'
import {
  deleteTeam,
  listCategories,
  listProblems,
  listTeams,
  nextTeamCode,
  saveTeam,
  setTeamProblem,
} from '../lib/db'

const blankTeam = () => ({
  members: [
    { email: '', password: randomPassword() },
    { email: '', password: randomPassword() },
  ],
  sendEmail: true,
})

export default function Teams() {
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState([])
  const [problems, setProblems] = useState([])
  const [categories, setCategories] = useState([])
  const [search, setSearch] = useState('')

  const [teamModal, setTeamModal] = useState(null)
  const [confirmSave, setConfirmSave] = useState(false)
  const [psModal, setPsModal] = useState(null) // { team, editing, problemId }
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [sendingId, setSendingId] = useState(null)

  async function refresh() {
    const [tms, probs, cats] = await Promise.all([listTeams(), listProblems(), listCategories()])
    setTeams(tms)
    setProblems(probs)
    setCategories(cats)
  }

  useEffect(() => {
    ;(async () => {
      try {
        await refresh()
      } catch (err) {
        toast.error(err?.message || 'Failed to load teams.')
      } finally {
        setLoading(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return teams
    return teams.filter((t) =>
      `${t.code} ${(t.members || []).map((m) => m?.email).join(' ')}`.toLowerCase().includes(q),
    )
  }, [teams, search])

  const catName = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories])
  const freeProblems = useMemo(() => problems.filter((p) => !p.assignedTeamId), [problems])
  const problemById = useMemo(() => Object.fromEntries(problems.map((p) => [p.id, p])), [problems])

  /* -------------------------------- create -------------------------------- */

  function updateMember(i, patch) {
    setTeamModal((t) => ({
      ...t,
      members: t.members.map((m, idx) => (idx === i ? { ...m, ...patch } : m)),
    }))
  }

  const teamModalValid =
    teamModal?.members?.[0]?.email?.trim() &&
    teamModal?.members?.[0]?.password?.trim() &&
    teamModal?.members?.[1]?.email?.trim() &&
    teamModal?.members?.[1]?.password?.trim()

  async function reallySaveTeam() {
    setBusy(true)
    const isNew = !teamModal.id
    try {
      // Team ID is assigned automatically on create and never changes afterwards.
      const code = teamModal.code || (await nextTeamCode())
      const payload = {
        code,
        members: teamModal.members.map((m) => ({
          email: m.email.trim().toLowerCase(),
          password: m.password.trim(),
        })),
      }
      await saveTeam(teamModal.id, payload)
      await refresh()
      setConfirmSave(false)

      if (teamModal.sendEmail) {
        try {
          const res = await sendCredentialEmail(payload)
          toast.success(`${code} saved. Credentials emailed to ${res.recipients.length} member(s).`)
        } catch (err) {
          toast.error(`${code} saved, but the email failed: ${err.message}`)
        }
      } else {
        toast.success(isNew ? `${code} created.` : `${code} updated.`)
      }
      setTeamModal(null)
    } catch (err) {
      toast.error(err?.message || 'Could not save the team.')
    } finally {
      setBusy(false)
    }
  }

  async function resend(team) {
    setSendingId(team.id)
    try {
      const res = await sendCredentialEmail(team)
      toast.success(`Credentials re-sent to ${res.recipients.join(', ')}.`)
    } catch (err) {
      toast.error(err?.message || 'Could not send the email.')
    } finally {
      setSendingId(null)
    }
  }

  function askDelete(team) {
    setConfirm({
      title: `Delete ${team.code}?`,
      message: team.problemId
        ? `This team holds ${team.problemCode}. Deleting the team releases that statement back to the pool.`
        : 'This permanently deletes the team and both member accounts.',
      label: 'Delete team',
      tone: 'danger',
      onConfirm: async () => {
        await deleteTeam(team.id)
        await refresh()
        toast.success('Team deleted.')
      },
    })
  }

  async function submitProblemChange() {
    setBusy(true)
    try {
      await setTeamProblem(psModal.team, psModal.problemId || null)
      await refresh()
      setPsModal(null)
      toast.success('Problem statement updated for the team.')
    } catch (err) {
      toast.error(err?.message || 'Could not update the problem statement.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="boot">Loading teams…</div>

  const accounts = teams.reduce((n, t) => n + (t.members?.filter((m) => m?.email).length || 0), 0)

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Teams / Accounts</h1>
          <p>
            {teams.length} teams · {accounts} participant accounts ·{' '}
            {teams.filter((t) => t.problemId).length} statements locked
          </p>
        </div>
        <div className="head-actions">
          <input
            className="search"
            placeholder="Search team ID, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn--primary" onClick={() => setTeamModal(blankTeam())}>
            + Add team
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <div className="table-scroll">
          <table style={{ minWidth: 940 }}>
            <thead>
              <tr>
                <th style={{ width: 96 }}>Team ID</th>
                <th>Member 1</th>
                <th>Member 2</th>
                <th style={{ width: 190 }}>Problem statement</th>
                <th style={{ width: 250 }} className="td-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.code}</td>
                  {[0, 1].map((i) => (
                    <td key={i}>
                      <div className="strong-cell">{t.members?.[i]?.email || '—'}</div>
                      {t.members?.[i]?.password && (
                        <div className="sub-cell">
                          pass: <code>{t.members[i].password}</code>
                        </div>
                      )}
                    </td>
                  ))}
                  <td>
                    {t.problemId ? (
                      <>
                        <span className="badge badge--locked">🔒 {t.problemCode}</span>
                        <div className="sub-cell">
                          {t.problemTitle?.length > 40 ? `${t.problemTitle.slice(0, 40)}…` : t.problemTitle}
                        </div>
                      </>
                    ) : (
                      <span className="badge badge--none">Not chosen</span>
                    )}
                  </td>
                  <td className="td-right">
                    <div className="cell-actions">
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setPsModal({ team: t, editing: !t.problemId, problemId: t.problemId || '' })}
                      >
                        {t.problemId ? 'PS' : 'Assign PS'}
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        disabled={sendingId === t.id}
                        onClick={() => resend(t)}
                      >
                        {sendingId === t.id ? 'Sending…' : '✉ Mail'}
                      </button>
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() =>
                          setTeamModal({
                            ...t,
                            members: [
                              t.members?.[0] || { email: '', password: '' },
                              t.members?.[1] || { email: '', password: '' },
                            ],
                            sendEmail: false,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button className="btn btn--danger btn--sm" onClick={() => askDelete(t)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty">
                      <h4>No teams yet</h4>
                      <p>Add a team to create its two participant accounts and email the credentials.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ------------------------------ team modal ----------------------------- */}
      <Modal
        open={Boolean(teamModal)}
        title={teamModal?.id ? `Edit ${teamModal.code}` : 'Add team'}
        subtitle="Two participant accounts, both sharing one Team ID and one problem statement."
        onClose={() => setTeamModal(null)}
        width={600}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setTeamModal(null)}>Cancel</button>
            <button className="btn btn--primary" onClick={() => setConfirmSave(true)} disabled={!teamModalValid}>
              {teamModal?.sendEmail ? 'Save & send email' : 'Save team'}
            </button>
          </>
        }
      >
        {[0, 1].map((i) => (
          <fieldset className="fieldset" key={i}>
            <legend>Member {i + 1}</legend>
            <div className="field-row">
              <div className="field">
                <label>Email ID</label>
                <input
                  type="email"
                  autoFocus={i === 0}
                  value={teamModal?.members?.[i]?.email || ''}
                  onChange={(e) => updateMember(i, { email: e.target.value })}
                  placeholder={`member${i + 1}@example.com`}
                />
              </div>
              <div className="field">
                <label>Password</label>
                <input
                  value={teamModal?.members?.[i]?.password || ''}
                  onChange={(e) => updateMember(i, { password: e.target.value })}
                />
              </div>
            </div>
          </fieldset>
        ))}

        <label style={{ display: 'flex', gap: 9, alignItems: 'center', fontSize: 13.5, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={Boolean(teamModal?.sendEmail)}
            onChange={(e) => setTeamModal((t) => ({ ...t, sendEmail: e.target.checked }))}
            style={{ width: 16, height: 16 }}
          />
          Email these credentials to both members now
        </label>
        <p className="hint" style={{ marginTop: 8 }}>
          {teamModal?.id ? (
            <>Team ID <b>{teamModal.code}</b> stays the same.</>
          ) : (
            <>A Team ID is assigned automatically when you save.</>
          )}{' '}
          Both members log in separately but share the team&rsquo;s single problem statement — whichever
          one of them picks it, both see it locked.
        </p>
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title={teamModal?.id ? 'Save changes?' : 'Create this team?'}
        message={
          teamModal?.sendEmail
            ? 'The two accounts will be saved in Firestore under one Team ID, and the credential email will be sent right away.'
            : 'The two accounts will be saved in Firestore under one Team ID. No email will be sent.'
        }
        confirmLabel="Yes, continue"
        busy={busy}
        onCancel={() => setConfirmSave(false)}
        onConfirm={reallySaveTeam}
      />

      {/* ------------------------- problem statement modal --------------------- */}
      <Modal
        open={Boolean(psModal)}
        title="Team problem statement"
        subtitle={psModal ? `${psModal.team.code} · shared by both members` : ''}
        onClose={() => setPsModal(null)}
        width={560}
        footer={
          psModal?.editing ? (
            <>
              <button className="btn btn--ghost" onClick={() => setPsModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={submitProblemChange} disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button className="btn btn--danger" onClick={() => setPsModal((p) => ({ ...p, editing: true, problemId: '' }))}>
                Release
              </button>
              <button className="btn btn--primary" onClick={() => setPsModal((p) => ({ ...p, editing: true }))}>
                Edit statement
              </button>
            </>
          )
        }
      >
        {!psModal?.editing ? (
          <>
            <p className="hint" style={{ marginBottom: 12 }}>🔒 Locked by this team:</p>
            <div className="card">
              <div className="mono" style={{ fontSize: 15 }}>{psModal?.team.problemCode}</div>
              <div className="strong-cell" style={{ marginTop: 6 }}>{psModal?.team.problemTitle}</div>
              {problemById[psModal?.team.problemId]?.description && (
                <p className="sub-cell" style={{ marginTop: 8, lineHeight: 1.65 }}>
                  {problemById[psModal.team.problemId].description}
                </p>
              )}
              <div style={{ marginTop: 10 }}>
                <span className="badge">{catName[problemById[psModal?.team.problemId]?.categoryId] || '—'}</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Problem statement</label>
              <select
                value={psModal?.problemId || ''}
                onChange={(e) => setPsModal((p) => ({ ...p, problemId: e.target.value }))}
              >
                <option value="">— None —</option>
                {psModal?.team.problemId && problemById[psModal.team.problemId] && (
                  <option value={psModal.team.problemId}>
                    {problemById[psModal.team.problemId].code} — {problemById[psModal.team.problemId].title} (current)
                  </option>
                )}
                {categories.map((c) => {
                  const list = freeProblems.filter((p) => p.categoryId === c.id)
                  if (!list.length) return null
                  return (
                    <optgroup label={c.name} key={c.id}>
                      {list.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} — {p.title}
                        </option>
                      ))}
                    </optgroup>
                  )
                })}
              </select>
            </div>
            <p className="hint">Only statements no other team has locked are listed.</p>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.label}
        tone={confirm?.tone}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setBusy(true)
          try {
            await confirm.onConfirm()
            setConfirm(null)
          } catch (err) {
            toast.error(err?.message || 'Action failed.')
          } finally {
            setBusy(false)
          }
        }}
      />
    </>
  )
}
