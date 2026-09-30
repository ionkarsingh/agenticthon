/** Sends the credential email through the nodemailer serverless function. */
export async function sendCredentialEmail(team) {
  const res = await fetch('/api/send-credentials', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team }),
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    throw new Error('Mail service did not respond. Is the API running (npm run dev)?')
  }

  if (!res.ok || !data.ok) throw new Error(data?.error || 'Failed to send the email.')
  return data
}

export function randomPassword(len = 8) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
