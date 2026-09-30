// Adds the queryable `memberEmails` array to team docs created before it existed.
import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import { collection, doc, getDocs, getFirestore, updateDoc } from 'firebase/firestore'

const db = getFirestore(initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
}))

const snap = await getDocs(collection(db, 'teams'))
let fixed = 0

for (const d of snap.docs) {
  const data = d.data()
  const emails = (data.members || [])
    .map((m) => String(m?.email || '').trim().toLowerCase())
    .filter(Boolean)
  const current = data.memberEmails || []
  const same = current.length === emails.length && current.every((e, i) => e === emails[i])
  if (same) continue
  await updateDoc(doc(db, 'teams', d.id), { memberEmails: emails })
  console.log(`${data.code}: memberEmails -> [${emails.join(', ')}]`)
  fixed += 1
}

console.log(`\n${snap.size} team(s) checked, ${fixed} updated.`)
process.exit(0)
