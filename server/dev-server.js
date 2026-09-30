// Local dev only: serves the same handler Vercel runs at /api/send-credentials.
import 'dotenv/config'
import express from 'express'
import sendCredentials from '../api/send-credentials.js'

const app = express()
app.use(express.json({ limit: '1mb' }))

app.all('/api/send-credentials', (req, res) => sendCredentials(req, res))

app.get('/api/health', (req, res) =>
  res.json({ ok: true, smtp: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER) }),
)

const port = Number(process.env.API_PORT || 5174)
app.listen(port, () => console.log(`[api] dev mail server on http://localhost:${port}`))
