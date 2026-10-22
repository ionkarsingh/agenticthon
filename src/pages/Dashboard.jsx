import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listCategories, listProblems, listTeams } from '../lib/db'
import { useToast } from '../components/Toast'

export default function Dashboard() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState([])
  const [problems, setProblems] = useState([])
  const [teams, setTeams] = useState([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const [cats, probs, tms] = await Promise.all([listCategories(), listProblems(), listTeams()])
        if (!alive) return
        setCategories(cats)
        setProblems(probs)
        setTeams(tms)
      } catch (err) {
        toast.error(err?.message || 'Failed to load data from Firestore.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const assigned = problems.filter((p) => p.assignedTeamId).length
  const teamsWithProblem = teams.filter((t) => t.problemId).length
  const accounts = teams.reduce((n, t) => n + (t.members?.filter((m) => m?.email).length || 0), 0)

  if (loading) return <div className="boot">Loading dashboard…</div>

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Live overview of the AIExplore setup.</p>
        </div>
        <div className="head-actions">
          <Link className="btn btn--ghost" to="/admin/problems">Problem statements</Link>
          <Link className="btn btn--primary" to="/admin/teams">Manage teams</Link>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat">
          <div className="stat__label">Categories</div>
          <div className="stat__value">{categories.length}</div>
          <div className="stat__hint">{categories.map((c) => c.name).join(' · ') || '—'}</div>
        </div>
        <div className="stat stat--blue">
          <div className="stat__label">Problem statements</div>
          <div className="stat__value">{problems.length}</div>
          <div className="stat__hint">{problems.length - assigned} still open</div>
        </div>
        <div className="stat stat--amber">
          <div className="stat__label">Locked statements</div>
          <div className="stat__value">{assigned}</div>
          <div className="stat__hint">assigned to a team</div>
        </div>
        <div className="stat stat--green">
          <div className="stat__label">Teams</div>
          <div className="stat__value">{teams.length}</div>
          <div className="stat__hint">{accounts} participant accounts</div>
        </div>
      </div>

      <h2 className="section-title">
        Categories <span>problem statements per track</span>
      </h2>
      <div className="cat-grid">
        {categories.map((c) => {
          const rows = problems.filter((p) => p.categoryId === c.id)
          const taken = rows.filter((p) => p.assignedTeamId).length
          const pct = rows.length ? Math.round((taken / rows.length) * 100) : 0
          return (
            <Link className="cat-tile" to="/admin/problems" key={c.id}>
              <div className="cat-tile__top">
                <h3>{c.name}</h3>
                <span className="badge">{rows.length} PS</span>
              </div>
              <div className="cat-bar"><i style={{ width: `${pct}%` }} /></div>
              <div className="cat-tile__meta">
                <span><b>{taken}</b> locked</span>
                <span><b>{rows.length - taken}</b> open</span>
              </div>
            </Link>
          )
        })}
      </div>

      <h2 className="section-title">
        Teams <span>{teamsWithProblem} of {teams.length} have locked a statement</span>
      </h2>
      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Team ID</th>
                <th>Member accounts</th>
                <th>Problem statement</th>
              </tr>
            </thead>
            <tbody>
              {teams.slice(0, 8).map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.code}</td>
                  <td>
                    {(t.members || []).filter((m) => m?.email).map((m, i) => (
                      <div key={i} className={i ? 'sub-cell' : 'strong-cell'}>{m.email}</div>
                    ))}
                  </td>
                  <td>
                    {t.problemId ? (
                      <>
                        <span className="badge badge--locked">🔒 {t.problemCode}</span>
                        <div className="sub-cell">{t.problemTitle}</div>
                      </>
                    ) : (
                      <span className="badge badge--free">Free</span>
                    )}
                  </td>
                </tr>
              ))}
              {!teams.length && (
                <tr>
                  <td colSpan={3}>
                    <div className="empty">
                      <h4>No teams yet</h4>
                      <p>Add team accounts from the Teams / Accounts page.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
