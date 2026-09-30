import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useParticipant } from '../../context/ParticipantContext'
import { useToast } from '../../components/Toast'
import { ConfirmDialog } from '../../components/Modal'
import { getTeam, listCategories, lockProblemForTeam } from '../../lib/db'
import { INSTRUCTIONS } from '../../lib/event'

export default function ProblemDetail() {
  const { problemId } = useParams()
  const { user } = useParticipant()
  const navigate = useNavigate()
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [problem, setProblem] = useState(null)
  const [category, setCategory] = useState(null)
  const [team, setTeam] = useState(null)
  const [confirmLock, setConfirmLock] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const [snap, cats, t] = await Promise.all([
          getDoc(doc(db, 'problems', problemId)),
          listCategories(),
          getTeam(user.teamId),
        ])
        if (t?.problemId) {
          navigate('/participant/portal', { replace: true })
          return
        }
        if (!snap.exists()) {
          toast.error('That problem statement no longer exists.')
          navigate('/participant/portal', { replace: true })
          return
        }
        const p = { id: snap.id, ...snap.data() }
        setProblem(p)
        setCategory(cats.find((c) => c.id === p.categoryId) || null)
        setTeam(t)
      } catch (err) {
        toast.error(err?.message || 'Could not load this problem statement.')
      } finally {
        setLoading(false)
      }
    })()
  }, [problemId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function lock() {
    setBusy(true)
    try {
      await lockProblemForTeam(user.teamId, problemId)
      setConfirmLock(false)
      toast.success(`${problem.code} is now locked for ${user.teamCode}.`)
      navigate('/participant/portal', { replace: true })
    } catch (err) {
      setConfirmLock(false)
      toast.error(err?.message || 'Could not lock this problem statement.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="boot">Loading…</div>
  if (!problem) return null

  const taken = Boolean(problem.assignedTeamId)

  return (
    <>
      <button
        className="btn btn--ghost btn--sm"
        onClick={() => navigate(`/participant/portal/category/${problem.categoryId}`)}
      >
        ← Back to {category?.name || 'category'}
      </button>

      <article className="ps-detail">
        <header className="ps-detail__head">
          <div className="ps-detail__tags">
            <span className="badge badge--accent">{problem.code}</span>
            <span className="badge">{category?.name || '—'}</span>
            {taken && <span className="badge badge--locked">Already taken</span>}
          </div>
          <h1>{problem.title}</h1>
        </header>

        {problem.description && (
          <div className="ps-detail__body">
            {problem.description.split(/\n\s*\n/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        <section className="ps-detail__rules">
          <h3>Before you lock this</h3>
          <ul>
            {INSTRUCTIONS.slice(3, 6).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>

        <footer className="ps-detail__foot">
          <div>
            <div className="muted" style={{ fontSize: 12.5 }}>Locking as</div>
            <strong className="mono" style={{ fontSize: 15 }}>{team?.code}</strong>
          </div>
          <button
            className="btn btn--primary btn--lg"
            disabled={taken || busy}
            onClick={() => setConfirmLock(true)}
          >
            {taken ? 'Already taken' : `🔒 Lock ${problem.code} for my team`}
          </button>
        </footer>
      </article>

      <ConfirmDialog
        open={confirmLock}
        title={`Lock ${problem.code}?`}
        message={`This is final. ${problem.code} — “${problem.title}” will be locked for ${team?.code} and you will not be able to change your problem statement afterwards. Both team members will work on this statement.`}
        confirmLabel="Yes, lock it"
        busy={busy}
        onCancel={() => setConfirmLock(false)}
        onConfirm={lock}
      />
    </>
  )
}
