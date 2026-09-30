import nodemailer from 'nodemailer'

const EVENT = {
  name: 'Agenticthon 2026',
  date: '1 October 2026',
  venue: 'LAB 307',
  reportTime: '9:15 AM',
  startTime: '9:30 AM',
}

function transporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.')
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 465),
    secure: String(SMTP_SECURE ?? 'true') === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  )

function credentialRow(label, email, password) {
  return `
    <tr>
      <td style="padding:14px 18px;border-bottom:1px solid #e8e6f0;">
        <div style="font:600 12px/1.4 Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6d6a86;">${esc(label)}</div>
        <div style="font:400 15px/1.7 Arial,sans-serif;color:#171525;margin-top:6px;">
          <strong>Email&nbsp;ID:</strong> ${esc(email)}<br />
          <strong>Password:</strong> <code style="background:#f2f0fb;padding:2px 7px;border-radius:5px;">${esc(password)}</code>
        </div>
      </td>
    </tr>`
}

function bullet(text) {
  return `
    <tr>
      <td style="padding:0 0 10px 0;font:400 14px/1.7 Arial,sans-serif;color:#2b2840;">
        <span style="color:#4f3bd8;font-weight:700;">&bull;</span>&nbsp;&nbsp;${text}
      </td>
    </tr>`
}

export function buildCredentialEmail(team) {
  const members = (Array.isArray(team.members) ? team.members : []).filter((m) => m && m.email)
  const rows = members.map((m, i) => credentialRow('Member ' + (i + 1), m.email, m.password)).join('')

  const text = [
    `${EVENT.name.toUpperCase()} — YOUR LOGIN CREDENTIALS`,
    ``,
    `Team ID: ${team.code}`,
    ``,
    ...members.map((m, i) => `Member ${i + 1} -> Email: ${m.email} | Password: ${m.password}`),
    ``,
    `HOW YOU WILL LOG IN`,
    `You will use these logins to access the portal tomorrow for ${EVENT.name}.`,
    `A QR code to open the portal will be shared with you on WhatsApp on the morning`,
    `of ${EVENT.date}. Scan that QR code, then sign in with your credentials above.`,
    ``,
    `REPORTING DETAILS — ${EVENT.date}`,
    `- Reach ${EVENT.venue} by ${EVENT.reportTime}.`,
    `- The competition starts at ${EVENT.startTime} sharp.`,
    `- Bring your own laptops. Arrange them in advance.`,
    ``,
    `PROBLEM STATEMENT RULE`,
    `One team can select only ONE problem statement. Once your team selects it, it is`,
    `locked — you cannot change your problem statement afterwards. No other team can`,
    `select a statement your team has already locked, so decide together and choose`,
    `carefully. Both members share the same team problem statement.`,
    ``,
    `ATTENDANCE & JUDGEMENT`,
    `- Attendance will be taken TWICE during the competition.`,
    `- Judgement will be conducted at the end.`,
    `- Your final attendance will be taken from the judgement attendance sheet only,`,
    `  so you must be present at the judgement round.`,
    ``,
    `Keep these credentials private and do not share them with other teams.`,
    ``,
    `— ${EVENT.name} Organising Team`,
  ].join('\n')

  const html = `
  <div style="background:#f5f4fa;padding:32px 16px;">
    <div style="max-width:580px;margin:0 auto;background:#ffffff;border:1px solid #e8e6f0;border-radius:16px;overflow:hidden;">

      <div style="background:linear-gradient(135deg,#4f3bd8,#8b5cf6);padding:28px 24px;">
        <div style="font:700 22px/1.3 Arial,sans-serif;color:#ffffff;letter-spacing:-.01em;">${esc(EVENT.name)}</div>
        <div style="font:400 14px/1.5 Arial,sans-serif;color:#e4defb;margin-top:4px;">Your login credentials &amp; reporting details</div>
      </div>

      <div style="padding:24px;">
        <p style="font:400 15px/1.7 Arial,sans-serif;color:#2b2840;margin:0 0 18px;">
          Your accounts for <strong>${esc(EVENT.name)}</strong> are ready. Your Team ID is
          <strong style="color:#4f3bd8;">${esc(team.code)}</strong> — both accounts below belong to this
          one team and share a single problem statement.
        </p>

        <table cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e8e6f0;border-radius:12px;overflow:hidden;">
          ${rows}
        </table>

        <div style="margin:22px 0 0;padding:16px 18px;background:#f6f4ff;border-left:3px solid #4f3bd8;border-radius:8px;">
          <div style="font:700 13px/1.4 Arial,sans-serif;color:#4f3bd8;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">How you will log in</div>
          <p style="font:400 14px/1.7 Arial,sans-serif;color:#2b2840;margin:0;">
            You will use these logins to access the portal <strong>tomorrow</strong> for ${esc(EVENT.name)}.
            A <strong>QR code</strong> to open the portal will be shared with you on <strong>WhatsApp</strong>
            on the morning of <strong>${esc(EVENT.date)}</strong>. Scan that QR code, then sign in with your
            credentials above.
          </p>
        </div>

        <div style="margin:20px 0 0;padding:16px 18px;border:1px solid #e8e6f0;border-radius:10px;">
          <div style="font:700 13px/1.4 Arial,sans-serif;color:#171525;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Reporting details &mdash; ${esc(EVENT.date)}</div>
          <table cellpadding="0" cellspacing="0" width="100%">
            ${bullet(`Reach <strong>${esc(EVENT.venue)}</strong> by <strong>${esc(EVENT.reportTime)}</strong>.`)}
            ${bullet(`The competition starts at <strong>${esc(EVENT.startTime)} sharp</strong>.`)}
            ${bullet(`<strong>Bring your own laptops</strong> &mdash; please arrange them in advance.`)}
          </table>
        </div>

        <div style="margin:16px 0 0;padding:16px 18px;background:#fff8ed;border:1px solid #fbe3bd;border-radius:10px;">
          <div style="font:700 13px/1.4 Arial,sans-serif;color:#a16207;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;">Problem statement rule</div>
          <p style="font:400 14px/1.7 Arial,sans-serif;color:#2b2840;margin:0;">
            One team can select only <strong>one</strong> problem statement. Once your team selects it, it is
            <strong>locked &mdash; you cannot change your problem statement afterwards</strong>. No other team
            can select a statement your team has locked, so decide together and choose carefully.
          </p>
        </div>

        <div style="margin:16px 0 0;padding:16px 18px;border:1px solid #e8e6f0;border-radius:10px;">
          <div style="font:700 13px/1.4 Arial,sans-serif;color:#171525;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px;">Attendance &amp; judgement</div>
          <table cellpadding="0" cellspacing="0" width="100%">
            ${bullet('Attendance will be taken <strong>two times</strong> during the competition.')}
            ${bullet('<strong>Judgement</strong> will be conducted at the end.')}
            ${bullet('Your <strong>final attendance</strong> will be taken from the <strong>judgement attendance sheet only</strong> &mdash; you must be present at the judgement round.')}
          </table>
        </div>

        <p style="font:400 13px/1.6 Arial,sans-serif;color:#6d6a86;margin:20px 0 0;">
          Keep these credentials private and do not share them with other teams. If anything looks
          wrong, reply to this email.
        </p>
      </div>

      <div style="padding:16px 24px;background:#faf9fe;border-top:1px solid #e8e6f0;font:400 12px/1.6 Arial,sans-serif;color:#8a87a3;">
        ${esc(EVENT.name)} Organising Team &middot; ${esc(EVENT.date)} &middot; ${esc(EVENT.venue)}
      </div>
    </div>
  </div>`

  return {
    subject: `${EVENT.name} — credentials & reporting details for ${team.code}`,
    text,
    html,
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' })
    return
  }

  try {
    const team = req.body?.team || req.body
    const recipients = (Array.isArray(team?.members) ? team.members.map((m) => m?.email) : [])
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i)

    if (!recipients.length) {
      res.status(400).json({ ok: false, error: 'At least one member email is required' })
      return
    }

    const { subject, text, html } = buildCredentialEmail(team)

    const info = await transporter().sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: recipients.join(', '),
      subject,
      text,
      html,
    })

    res.status(200).json({ ok: true, messageId: info.messageId, recipients })
  } catch (err) {
    res.status(500).json({ ok: false, error: err?.message || 'Failed to send email' })
  }
}
