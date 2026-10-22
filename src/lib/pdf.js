import { jsPDF } from 'jspdf'
import { EVENT, INSTRUCTIONS } from './event.js'

// jsPDF's built-in Helvetica is WinAnsi-encoded — characters outside that set
// (em dash, curly quotes, ellipsis) are silently dropped, so fold them first.
const win = (s) =>
  String(s ?? '')
    .replace(/[—–]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...')
    .replace(/•/g, '-')

const MARGIN = 48
const ACCENT = [79, 59, 216]
const INK = [23, 21, 37]
const MUTED = [109, 106, 134]

/**
 * Builds the problem statement PDF a team downloads after locking.
 * Carries the category, PS ID, full statement, team details, the event
 * instructions, and the exact date and time of download at the end.
 */
export function buildProblemPdf({ team, problem, categoryName }) {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageW = pdf.internal.pageSize.getWidth()
  const pageH = pdf.internal.pageSize.getHeight()
  const contentW = pageW - MARGIN * 2
  let y = 0

  const now = new Date()
  const downloadedAt = now.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  const draw = (txt, x, yy, opts) => pdf.text(win(txt), x, yy, opts)
  const split = (txt, w) => pdf.splitTextToSize(win(txt), w)

  /** Moves to a new page when the next block would overflow. */
  const ensure = (needed) => {
    if (y + needed > pageH - 64) {
      pdf.addPage()
      y = MARGIN
    }
  }

  // ---------------------------------------------------------------- header
  pdf.setFillColor(...ACCENT)
  pdf.rect(0, 0, pageW, 92, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold').setFontSize(20)
  draw(EVENT.name, MARGIN, 44)
  pdf.setFont('helvetica', 'normal').setFontSize(10.5)
  draw('Problem Statement — official copy', MARGIN, 64)
  draw(`${EVENT.date}  ·  ${EVENT.venue}`, pageW - MARGIN, 64, { align: 'right' })
  y = 92 + 30

  // ------------------------------------------------------------ team strip
  pdf.setDrawColor(232, 230, 240).setFillColor(248, 247, 253)
  pdf.roundedRect(MARGIN, y, contentW, 58, 6, 6, 'FD')
  const col = contentW / 3
  const cells = [
    ['TEAM ID', team.code || '—'],
    ['CATEGORY', categoryName || '—'],
    ['PROBLEM ID', problem.code || '—'],
  ]
  cells.forEach(([label, value], i) => {
    const x = MARGIN + 16 + col * i
    pdf.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...MUTED)
    draw(label, x, y + 22)
    pdf.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...INK)
    draw(String(value), x, y + 41)
  })
  y += 58 + 26

  // -------------------------------------------------------------- statement
  pdf.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...ACCENT)
  draw('PROBLEM STATEMENT', MARGIN, y)
  y += 16

  pdf.setFont('helvetica', 'bold').setFontSize(15).setTextColor(...INK)
  const titleLines = split(problem.title || '—', contentW)
  titleLines.forEach((line) => {
    ensure(22)
    draw(line, MARGIN, y)
    y += 20
  })
  y += 8

  if (problem.description) {
    pdf.setFont('helvetica', 'normal').setFontSize(10.5).setTextColor(60, 57, 82)
    problem.description.split(/\n\s*\n/).forEach((para) => {
      split(para.replace(/\n/g, ' ').trim(), contentW).forEach((line) => {
        ensure(18)
        draw(line, MARGIN, y)
        y += 15.5
      })
      y += 8
    })
  }

  // ------------------------------------------------------------ team members
  y += 8
  ensure(70)
  pdf.setDrawColor(232, 230, 240)
  pdf.line(MARGIN, y, pageW - MARGIN, y)
  y += 20
  pdf.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...ACCENT)
  draw('TEAM MEMBERS', MARGIN, y)
  y += 15
  pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...INK)
  ;(team.members || [])
    .filter((m) => m?.email)
    .forEach((m, i) => {
      ensure(16)
      draw(`${i + 1}.  ${m.email}`, MARGIN, y)
      y += 15
    })

  // ------------------------------------------------------------ instructions
  y += 14
  ensure(60)
  pdf.setFont('helvetica', 'bold').setFontSize(7.5).setTextColor(...ACCENT)
  draw('INSTRUCTIONS', MARGIN, y)
  y += 16

  pdf.setFont('helvetica', 'normal').setFontSize(10).setTextColor(60, 57, 82)
  INSTRUCTIONS.forEach((item) => {
    const lines = split(item, contentW - 16)
    ensure(lines.length * 14 + 6)
    pdf.setTextColor(...ACCENT)
    draw('·', MARGIN, y)
    pdf.setTextColor(60, 57, 82)
    lines.forEach((line, i) => {
      draw(line, MARGIN + 16, y + i * 14)
    })
    y += lines.length * 14 + 6
  })

  // ------------------------------------------------- footer on every page
  const pages = pdf.internal.getNumberOfPages()
  for (let i = 1; i <= pages; i += 1) {
    pdf.setPage(i)
    pdf.setDrawColor(232, 230, 240)
    pdf.line(MARGIN, pageH - 52, pageW - MARGIN, pageH - 52)
    pdf.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...MUTED)
    draw(`Downloaded on ${downloadedAt}`, MARGIN, pageH - 34)
    draw(`${team.code} · ${problem.code}`, pageW / 2, pageH - 34, { align: 'center' })
    draw(`Page ${i} of ${pages}`, pageW - MARGIN, pageH - 34, { align: 'right' })
  }

  return { pdf, downloadedAt, filename: `${team.code}_${problem.code}_AIExplore2026.pdf` }
}

/** Builds the PDF and hands it to the browser as a download. */
export function downloadProblemPdf(args) {
  const { pdf, downloadedAt, filename } = buildProblemPdf(args)
  pdf.save(filename)
  return downloadedAt
}
