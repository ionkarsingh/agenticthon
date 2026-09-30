import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useParticipant } from '../../context/ParticipantContext'
import { useToast } from '../../components/Toast'
import { getTeam, listCategories, listProblems } from '../../lib/db'
import LockedStatement from './LockedStatement'

export default function PortalCategories() {
  const { user } = useParticipant()
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState(null)
  const [categories, setCategories] = useState([])
  const [problems, setProblems] = useState([])

  async function load() {
    const [t, cats, probs] = await Promise.all([getTeam(user.teamId), listCategories(), listProblems()])
    setTeam(t)
    setCategories(cats)
    setProblems(probs)
  }

  useEffect(() => {
    ;(async () => {
      try {
        await load()
      } catch (err) {
        toast.error(err?.message || 'Could not load the portal.')
      } finally {
        setLoading(false)
      }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="boot">Loading…</div>

  // Already locked — the team only ever sees their own statement from here on.
  if (team?.problemId) {
    return <LockedStatement team={team} categories={categories} />
  }

  return (
    <>
      <div className="portal-head">
        <h1>Choose your problem statement</h1>
        <p>
          Pick a category to see the statements still available. Your team can lock{' '}
          <strong>one statement only</strong>, and it cannot be changed afterwards.
        </p>
      </div>

      {!categories.length ? (
        <div className="panel panel--empty">
          <h3>Nothing to choose yet</h3>
          <p>The organisers have not published the categories yet. Please check back shortly.</p>
        </div>
      ) : (
        <div className="choice-grid">
          {categories.map((c) => {
            const list = problems.filter((p) => p.categoryId === c.id)
            const open = list.filter((p) => !p.assignedTeamId).length
            return (
              <button
                key={c.id}
                className="choice-card"
                disabled={!open}
                onClick={() => navigate(`/participant/portal/category/${c.id}`)}
              >
                <span className="choice-card__code">{c.code}</span>
                <h3>{c.name}</h3>
                <div className="choice-card__meta">
                  <span className={open ? 'badge badge--free' : 'badge badge--none'}>
                    {open} available
                  </span>
                  <span className="muted">{list.length} total</span>
                </div>
                <span className="choice-card__go">{open ? 'View statements →' : 'All taken'}</span>
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
