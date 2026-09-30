import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useToast } from '../../components/Toast'
import { downloadProblemPdf } from '../../lib/pdf'
import { EVENT, INSTRUCTIONS } from '../../lib/event'

export default function LockedStatement({ team, categories }) {
  const toast = useToast()
  const [problem, setProblem] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'problems', team.problemId))
        if (snap.exists()) setProblem({ id: snap.id, ...snap.data() })
      } catch {
        /* the summary on the team doc is enough to render */
      }
    })()
  }, [team.problemId])

  const categoryName = categories.find((c) => c.id === problem?.categoryId)?.name || '—'

  function onDownload() {
    try {
      const at = downloadProblemPdf({
        team,
        problem: problem || {
          code: team.problemCode,
          title: team.problemTitle,
          description: '',
        },
        categoryName,
      })
      toast.success(`PDF downloaded · ${at}`)
    } catch (err) {
      toast.error(err?.message || 'Could not generate the PDF.')
    }
  }

  return (
    <>
      <div className="portal-head">
        <span className="kicker">Your team&rsquo;s problem statement</span>
        <h1>Locked in 🔒</h1>
        <p>
          {team.code} is working on the statement below. This cannot be changed — download your
          official copy and get started.
        </p>
      </div>

      <article className="ps-detail ps-detail--locked">
        <header className="ps-detail__head">
          <div className="ps-detail__tags">
            <span className="badge badge--accent">{problem?.code || team.problemCode}</span>
            <span className="badge">{categoryName}</span>
            <span className="badge badge--locked">🔒 Locked to {team.code}</span>
          </div>
          <h1>{problem?.title || team.problemTitle}</h1>
        </header>

        {problem?.description && (
          <div className="ps-detail__body">
            {problem.description.split(/\n\s*\n/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        )}

        <footer className="ps-detail__foot">
          <div>
            <div className="muted" style={{ fontSize: 12.5 }}>Team members</div>
            <strong style={{ fontSize: 13.5 }}>
              {(team.members || []).filter((m) => m?.email).map((m) => m.email).join(' · ')}
            </strong>
          </div>
          <button className="btn btn--primary btn--lg" onClick={onDownload}>
            ⭳ Download PDF
          </button>
        </footer>
      </article>

      <section className="panel">
        <h3 style={{ fontSize: 15, marginBottom: 12 }}>Instructions — {EVENT.date}</h3>
        <ul className="rule-list">
          {INSTRUCTIONS.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </section>
    </>
  )
}
