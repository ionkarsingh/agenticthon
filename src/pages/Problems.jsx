import { useEffect, useMemo, useRef, useState } from 'react'
import Modal, { ConfirmDialog } from '../components/Modal'
import { useToast } from '../components/Toast'
import {
  assignProblemToTeam,
  deleteCategory,
  deleteProblem,
  listCategories,
  nextCategoryCode,
  nextProblemCode,
  importProblems,
  listProblems,
  listTeams,
  saveCategory,
  saveProblem,
} from '../lib/db'

const emptyProblem = { title: '', description: '' }

export default function Problems() {
  const toast = useToast()
  const fileRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [problems, setProblems] = useState([])
  const [teams, setTeams] = useState([])
  const [activeCat, setActiveCat] = useState(null)
  const [search, setSearch] = useState('')

  const [catModal, setCatModal] = useState(null) // { id?, name }
  const [problemModal, setProblemModal] = useState(null) // { id?, ...fields }
  const [confirmSave, setConfirmSave] = useState(false)
  const [assignModal, setAssignModal] = useState(null) // { problem, editing, teamId }
  const [confirm, setConfirm] = useState(null) // { title, message, onConfirm, tone, label }
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const [cats, probs, tms] = await Promise.all([listCategories(), listProblems(), listTeams()])
    setCategories(cats)
    setProblems(probs)
    setTeams(tms)
    return cats
  }

  useEffect(() => {
    ;(async () => {
      try {
        await refresh()
      } catch (err) {
        toast.error(err?.message || 'Failed to load from Firestore.')
      } finally {
        setLoading(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    if (!activeCat) return []
    const q = search.trim().toLowerCase()
    return problems
      .filter((p) => p.categoryId === activeCat.id)
      .filter((p) => !q || `${p.code} ${p.title} ${p.description}`.toLowerCase().includes(q))
  }, [problems, activeCat, search])

  const freeTeams = useMemo(() => teams.filter((t) => !t.problemId), [teams])
  const teamById = useMemo(() => Object.fromEntries(teams.map((t) => [t.id, t])), [teams])

  /* ------------------------------ category ------------------------------- */

  function openCategoryModal(cat) {
    setCatModal(cat ? { id: cat.id, code: cat.code || '', name: cat.name, order: cat.order } : { name: '' })
  }

  async function submitCategory(e) {
    e.preventDefault()
    const name = catModal.name.trim()
    if (!name) return
    setBusy(true)
    try {
      // The category ID is assigned on save and never changes afterwards.
      const code = catModal.code || (await nextCategoryCode())
      await saveCategory(catModal.id, {
        code,
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        order: catModal.order ?? categories.length + 1,
      })
      const cats = await refresh()
      if (activeCat) setActiveCat(cats.find((c) => c.id === activeCat.id) || null)
      setCatModal(null)
      toast.success(catModal.id ? 'Category updated.' : 'Category added.')
    } catch (err) {
      toast.error(err?.message || 'Could not save the category.')
    } finally {
      setBusy(false)
    }
  }

  function askDeleteCategory(cat) {
    const count = problems.filter((p) => p.categoryId === cat.id).length
    setConfirm({
      title: `Delete “${cat.name}”?`,
      message: `This permanently deletes the category and its ${count} problem statement${count === 1 ? '' : 's'}. Teams holding any of them will be released.`,
      label: 'Delete category',
      tone: 'danger',
      onConfirm: async () => {
        await deleteCategory(cat.id)
        await refresh()
        if (activeCat?.id === cat.id) setActiveCat(null)
        toast.success('Category deleted.')
      },
    })
  }

  /* ------------------------------ problems ------------------------------- */

  async function reallySaveProblem() {
    setBusy(true)
    try {
      // The PS ID is assigned on save and never changes afterwards.
      const code = problemModal.code || (await nextProblemCode())
      await saveProblem(problemModal.id, {
        categoryId: activeCat.id,
        code,
        title: problemModal.title.trim(),
        description: problemModal.description.trim(),
      })
      await refresh()
      setConfirmSave(false)
      setProblemModal(null)
      toast.success(`${code} saved.`)
    } catch (err) {
      toast.error(err?.message || 'Could not save the problem statement.')
    } finally {
      setBusy(false)
    }
  }

  function askDeleteProblem(p) {
    setConfirm({
      title: `Delete ${p.code}?`,
      message: p.assignedTeamId
        ? `This statement is locked by ${p.assignedTeamCode}. Deleting it will release that team.`
        : 'This permanently deletes the problem statement.',
      label: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        await deleteProblem(p.id)
        await refresh()
        toast.success('Problem statement deleted.')
      },
    })
  }

  async function onImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      const items = Array.isArray(parsed) ? parsed : parsed.problems || parsed.items || parsed.data
      if (!Array.isArray(items)) throw new Error('JSON must be an array, or an object with a "problems" array.')
      const n = await importProblems(activeCat.id, items)
      await refresh()
      toast.success(`Imported ${n} problem statements into ${activeCat.name}.`)
    } catch (err) {
      toast.error(err?.message || 'Could not read that JSON file.')
    }
  }

  /* ----------------------------- assignment ------------------------------ */

  async function submitAssignment() {
    setBusy(true)
    try {
      await assignProblemToTeam(assignModal.problem, assignModal.teamId || null)
      await refresh()
      setAssignModal(null)
      toast.success(assignModal.teamId ? 'Problem statement assigned.' : 'Assignment cleared.')
    } catch (err) {
      toast.error(err?.message || 'Could not update the assignment.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="boot">Loading problem statements…</div>

  /* -------------------------------- views -------------------------------- */

  return (
    <>
      {!activeCat ? (
        <>
          <div className="page-head">
            <div>
              <h1>Problem Statements</h1>
              <p>
                {categories.length
                  ? 'Pick a category to manage the statements inside it.'
                  : 'Create a category first, then add its problem statements.'}
              </p>
            </div>
            <div className="head-actions">
              <button className="btn btn--primary" onClick={() => openCategoryModal()}>
                + Add category
              </button>
            </div>
          </div>

          {!categories.length && (
            <div className="table-wrap">
              <div className="empty">
                <h4>No categories yet</h4>
                <p>
                  Add a category — it gets its own ID automatically — then open it to add or import
                  its problem statements.
                </p>
                <button className="btn btn--primary" style={{ marginTop: 16 }} onClick={() => openCategoryModal()}>
                  + Add your first category
                </button>
              </div>
            </div>
          )}

          <div className="cat-grid">
            {categories.map((c) => {
              const list = problems.filter((p) => p.categoryId === c.id)
              const taken = list.filter((p) => p.assignedTeamId).length
              const pct = list.length ? Math.round((taken / list.length) * 100) : 0
              return (
                <div className="cat-tile" key={c.id} onClick={() => { setSearch(''); setActiveCat(c) }}>
                  <div className="cat-tile__top">
                    <div>
                      <div className="mono">{c.code || '—'}</div>
                      <h3 style={{ marginTop: 4 }}>{c.name}</h3>
                    </div>
                    <span className="badge">{list.length} PS</span>
                  </div>
                  <div className="cat-bar"><i style={{ width: `${pct}%` }} /></div>
                  <div className="cat-tile__meta">
                    <span><b>{taken}</b> locked</span>
                    <span><b>{list.length - taken}</b> open</span>
                  </div>
                  <div className="cell-actions" style={{ justifyContent: 'flex-start' }}>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={(e) => { e.stopPropagation(); openCategoryModal(c) }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn--danger btn--sm"
                      onClick={(e) => { e.stopPropagation(); askDeleteCategory(c) }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <>
          <div className="page-head">
            <div>
              <button className="btn btn--ghost btn--sm" onClick={() => setActiveCat(null)} style={{ marginBottom: 10 }}>
                ← All categories
              </button>
              <h1>{activeCat.name}</h1>
              <p>
                {rows.length} statement{rows.length === 1 ? '' : 's'} ·{' '}
                {rows.filter((r) => r.assignedTeamId).length} locked by a team
              </p>
            </div>
            <div className="head-actions">
              <input
                className="search"
                placeholder="Search statements…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onImportFile} />
              <button className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
                ⇪ Import JSON
              </button>
              <button className="btn btn--primary" onClick={() => setProblemModal({ ...emptyProblem })}>
                + Add statement
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 100 }}>PS ID</th>
                    <th>Problem statement</th>
                    <th style={{ width: 180 }}>Assigned to</th>
                    <th style={{ width: 240 }} className="td-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td className="mono">{p.code}</td>
                      <td>
                        <div className="strong-cell">{p.title || <span className="muted">Untitled</span>}</div>
                        {p.description && (
                          <div className="sub-cell">
                            {p.description.length > 130 ? `${p.description.slice(0, 130)}…` : p.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {p.assignedTeamId ? (
                          <span className="badge badge--locked">🔒 {teamById[p.assignedTeamId]?.code || p.assignedTeamCode}</span>
                        ) : (
                          <span className="badge badge--free">Open</span>
                        )}
                      </td>
                      <td className="td-right">
                        <div className="cell-actions">
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => setAssignModal({ problem: p, editing: !p.assignedTeamId, teamId: p.assignedTeamId || '' })}
                          >
                            {p.assignedTeamId ? 'Assigned' : 'Assign'}
                          </button>
                          <button className="btn btn--ghost btn--sm" onClick={() => setProblemModal({ ...p })}>
                            Edit
                          </button>
                          <button className="btn btn--danger btn--sm" onClick={() => askDeleteProblem(p)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!rows.length && (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty">
                          <h4>No problem statements here yet</h4>
                          <p>Add one manually, or import a JSON file of statements for {activeCat.name}.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ---------------------------- category modal --------------------------- */}
      <Modal
        open={Boolean(catModal)}
        title={catModal?.id ? 'Edit category' : 'Add category'}
        subtitle="Categories group the problem statements participants choose from."
        onClose={() => setCatModal(null)}
        width={480}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setCatModal(null)}>Cancel</button>
            <button className="btn btn--primary" onClick={submitCategory} disabled={busy || !catModal?.name?.trim()}>
              {busy ? 'Saving…' : 'Save category'}
            </button>
          </>
        }
      >
        <form onSubmit={submitCategory}>
          <div className="field">
            <label>Category name</label>
            <input
              autoFocus
              value={catModal?.name || ''}
              onChange={(e) => setCatModal((c) => ({ ...c, name: e.target.value }))}
              placeholder="e.g. AI Agent"
            />
          </div>
          <p className="hint">
            {catModal?.id ? (
              <>Category ID <b>{catModal.code || '—'}</b> stays the same.</>
            ) : (
              <>A category ID is assigned automatically when you save.</>
            )}
          </p>
        </form>
      </Modal>

      {/* ---------------------------- problem modal ---------------------------- */}
      <Modal
        open={Boolean(problemModal)}
        title={problemModal?.id ? `Edit ${problemModal.code || 'statement'}` : 'Add problem statement'}
        subtitle={activeCat?.name}
        onClose={() => setProblemModal(null)}
        width={620}
        footer={
          <>
            <button className="btn btn--ghost" onClick={() => setProblemModal(null)}>Cancel</button>
            <button
              className="btn btn--primary"
              onClick={() => setConfirmSave(true)}
              disabled={!problemModal?.title?.trim()}
            >
              OK
            </button>
          </>
        }
      >
        <div className="field">
          <label>Title / statement</label>
          <input
            value={problemModal?.title || ''}
            onChange={(e) => setProblemModal((p) => ({ ...p, title: e.target.value }))}
            placeholder="Short title of the problem statement"
          />
        </div>
        <div className="field">
          <label>Description</label>
          <textarea
            value={problemModal?.description || ''}
            onChange={(e) => setProblemModal((p) => ({ ...p, description: e.target.value }))}
            placeholder="Full problem statement, context, expected deliverables…"
          />
        </div>
        <p className="hint">
          {problemModal?.id ? (
            <>PS ID <b>{problemModal.code || '—'}</b> stays the same.</>
          ) : (
            <>A PS ID is assigned automatically when you save.</>
          )}
        </p>
        {problemModal?.assignedTeamId && (
          <p className="hint" style={{ marginTop: 6 }}>
            🔒 Locked by <b>{problemModal.assignedTeamCode}</b> — editing the text updates what that team sees.
          </p>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmSave}
        title="Save changes?"
        message="The problem statement will be updated for everyone, including any team that has already locked it."
        confirmLabel="Yes, save"
        busy={busy}
        onCancel={() => setConfirmSave(false)}
        onConfirm={reallySaveProblem}
      />

      {/* ---------------------------- assign modal ----------------------------- */}
      <Modal
        open={Boolean(assignModal)}
        title="Assignment"
        subtitle={assignModal ? `${assignModal.problem.code} · ${assignModal.problem.title}` : ''}
        onClose={() => setAssignModal(null)}
        width={500}
        footer={
          assignModal?.editing ? (
            <>
              <button className="btn btn--ghost" onClick={() => setAssignModal(null)}>Cancel</button>
              <button className="btn btn--primary" onClick={submitAssignment} disabled={busy}>
                {busy ? 'Saving…' : 'Save assignment'}
              </button>
            </>
          ) : (
            <>
              <button
                className="btn btn--danger"
                onClick={() => setAssignModal((a) => ({ ...a, editing: true, teamId: '' }))}
              >
                Release
              </button>
              <button className="btn btn--primary" onClick={() => setAssignModal((a) => ({ ...a, editing: true }))}>
                Edit assignment
              </button>
            </>
          )
        }
      >
        {!assignModal?.editing ? (
          <>
            <p className="hint" style={{ marginBottom: 12 }}>This statement is locked by:</p>
            <div className="card">
              <div className="mono" style={{ fontSize: 15 }}>{teamById[assignModal?.problem.assignedTeamId]?.code}</div>
              <div className="sub-cell">
                {(teamById[assignModal?.problem.assignedTeamId]?.members || [])
                  .filter((m) => m?.email)
                  .map((m) => m.email)
                  .join(' · ')}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="field">
              <label>Assign to team</label>
              <select
                value={assignModal?.teamId || ''}
                onChange={(e) => setAssignModal((a) => ({ ...a, teamId: e.target.value }))}
              >
                <option value="">— Not assigned —</option>
                {assignModal?.problem.assignedTeamId && teamById[assignModal.problem.assignedTeamId] && (
                  <option value={assignModal.problem.assignedTeamId}>
                    {teamById[assignModal.problem.assignedTeamId].code} (current)
                  </option>
                )}
                {freeTeams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.code} — {(t.members || []).filter((m) => m?.email).map((m) => m.email).join(' · ')}
                  </option>
                ))}
              </select>
            </div>
            <p className="hint">
              Only teams that have not locked a statement are listed. A team can hold exactly one statement.
            </p>
            {!freeTeams.length && !assignModal?.problem.assignedTeamId && (
              <p className="error-text" style={{ marginTop: 8 }}>Every team already holds a statement.</p>
            )}
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
