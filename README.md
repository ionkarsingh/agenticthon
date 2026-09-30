# Agenticthon — Admin Console

React (Vite) + Firebase Firestore + Nodemailer SMTP.
Admin side of the Agenticthon competition portal: categories, problem statements, team accounts,
assignment locking, and credential emails.

## Run it

```bash
npm install
cp .env.example .env     # fill in Firebase + SMTP values
npm run dev              # web on :5173, mail API on :5174
```

`npm run dev` runs both the Vite app and the local mail API (Vite proxies `/api` → `:5174`).

## Environment

| Key | What it is |
| --- | --- |
| `VITE_FIREBASE_*` | Firebase web app config (Project settings → Your apps → Web) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | SMTP server (Gmail: `smtp.gmail.com` / `465` / `true`) |
| `SMTP_USER` / `SMTP_PASS` | SMTP login — for Gmail use an **App Password**, not your account password |
| `SMTP_FROM` | From header, e.g. `"Agenticthon <you@gmail.com>"` |

## Admin login

Seeded on first sign-in into the `admins` collection:

- `onkar.singh@gnauniversity.edu.in` / `8543691`

If the `admins` collection is empty, the first login attempt creates that document.
Add more admins directly in Firestore (`admins`: `email`, `password`, `name`).

## Firestore shape

```
admins/{id}      email, password, name
categories/{id}  name, slug, order
problems/{id}    categoryId, code, title, description, assignedTeamId, assignedTeamCode
teams/{id}       code, teamName, teamEmail, teamPassword,
                 members: [{email, password}, {email, password}],
                 problemId, problemCode, problemTitle
```

Categories `LLM's`, `Gen AI`, `AI Agent` are seeded automatically the first time the app loads.

**The assignment invariant:** one team holds at most one problem statement, and one statement is held
by at most one team. Every assignment write is a Firestore batch that updates both sides and releases
whatever was previously linked, so the two collections can't drift apart.

## Problem statement format

A statement has exactly three fields:

| Field | Required | What it is |
| --- | --- | --- |
| `code` | no | The PS ID shown everywhere, e.g. `PS-001`. Generated if you leave it out. |
| `title` | **yes** | One-line title. This is what participants scan in the pick list. |
| `description` | no | The full statement. Use `
` for line breaks and `

` for paragraphs. |

The category is **not** part of the file — you import into whichever category you have open,
and every statement in that file lands there. So keep one JSON file per category.

```json
[
  {
    "code": "PS-001",
    "title": "Autonomous research assistant for literature review",
    "description": "Build an agent that takes a research question...

Expected output: a working demo."
  }
]
```

A bare array is the normal shape; `{ "problems": [...] }`, `{ "items": [...] }` and
`{ "data": [...] }` also work. These key aliases are accepted so you can reuse data you
already have:

- `code` &larr; `id`
- `title` &larr; `statement`, `problem`, `name`
- `description` &larr; `details`, `desc`

Nothing else is read. Extra keys in your file are ignored rather than rejected, so a file
carrying more detail still imports cleanly.

**Rules worth knowing**

- `code` is a label, not a key — the app does not deduplicate on it. Importing the same file
  twice creates two copies of every statement.
- Missing `code` values are filled in as `PS-001`, `PS-002`, … continuing from the count
  already in that category.
- Imported statements always start unassigned; assignment is never part of the file.
- `title` is what a team sees in the dropdown. Keep it short and distinct.

See `sample-problems.json` for a working file.

## Importing problem statements

Open a category &rarr; **Import JSON** &rarr; pick the file. The import is a single batched write,
so either every statement in the file lands or none does.

Adding one by hand: **+ Add statement** &rarr; PS ID (pre-filled), Title, Description &rarr; **OK**
&rarr; confirm.

## Deploying to Vercel

1. Push the repo to GitHub, then import it in Vercel (framework preset: **Vite**).
2. Add every key from `.env.example` in **Project Settings → Environment Variables**.
3. Deploy. `api/send-credentials.js` is picked up automatically as a serverless function.

## Note on passwords

Passwords are stored as plain text in Firestore, as specified for this event. Firestore security rules
should therefore restrict the `admins` and `teams` collections to server/admin access before the portal
is public.
