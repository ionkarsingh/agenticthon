import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useParticipant } from '../../context/ParticipantContext'
import { useToast } from '../../components/Toast'
import { getTeam, listCategories, listProblems } from '../../lib/db'

export default function CategoryProblems() {
  const { categoryId } = useParams()
  const { user } = useParticipant()
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState(null)
  const [problems, setProblems] = useState([])

  useEffect(() => {
    ;(async () => {
      try {
        const [team, cats, probs] = await Promise.all([
          getTeam(user.teamId),
          listCategories(),
          listProblems(categoryId),
        ])
        if (team?.problemId) {
          navigate('/participant/portal', { replace: true })
          return
        }
        setCategory(cats.find((c) => c.id === categoryId) || null)
        setProblems(probs)
      } catch (err) {
        toast.error(err?.message || 'Could not load this category.')
      } finally {
        setLoading(false)
      }
    })()
  }, [categoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <div className="boot">Loading statements…</div>

  const open = problems.filter((p) => !p.assignedTeamId)

  return (
    <>
      <button className="btn btn--ghost btn--sm" onClick={() => navigate('/participant/portal')}>
        ← All categories
      </button>

      <div className="portal-head" style={{ marginTop: 14 }}>
        <span className="kicker">{category?.code}</span>
        <h1>{category?.name || 'Category'}</h1>
        <p>
          {open.length} statement{open.length === 1 ? '' : 's'} available. Open one to read it in
          full before you lock it.
        </p>
      </div>

      {!open.length ? (
        <div className="panel panel--empty">
          <h3>All statements in this category are taken</h3>
          <p>Go back and pick a different category.</p>
        </div>
      ) : (
        <div className="ps-list">
          {open.map((p) => (
            <button key={p.id} className="ps-row" onClick={() => navigate(`/participant/portal/problem/${p.id}`)}>
              <span className="ps-row__code">{p.code}</span>
              <span className="ps-row__body">
                <strong>{p.title}</strong>
                {p.description && (
                  <span className="ps-row__desc">
                    {p.description.length > 160 ? `${p.description.slice(0, 160)}…` : p.description}
                  </span>
                )}
              </span>
              <span className="ps-row__go">→</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
