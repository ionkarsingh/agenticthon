// Seeds / updates an admin account in the Firestore `admins` collection.
//   npm run seed:admin                       -> seeds the default admin
//   npm run seed:admin -- a@b.com secret Name -> seeds a specific admin
import 'dotenv/config'
import { initializeApp } from 'firebase/app'
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'

const DEFAULT_ADMIN = {
  email: 'onkar.singh@gnauniversity.edu.in',
  password: '8543691',
  name: 'Onkar Singh',
}

const [email = DEFAULT_ADMIN.email, password = DEFAULT_ADMIN.password, ...nameParts] =
  process.argv.slice(2)
const name = nameParts.join(' ') || DEFAULT_ADMIN.name

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
})

if (!process.env.VITE_FIREBASE_PROJECT_ID) {
  console.error('Missing Firebase config — is .env filled in?')
  process.exit(1)
}

const db = getFirestore(app)
const clean = email.trim().toLowerCase()

const snap = await getDocs(collection(db, 'admins'))
const existing = snap.docs.find((d) => String(d.data().email || '').toLowerCase() === clean)

if (existing) {
  await updateDoc(doc(db, 'admins', existing.id), { email: clean, password, name })
  console.log(`Updated admin ${clean} (doc ${existing.id})`)
} else {
  const ref = await addDoc(collection(db, 'admins'), {
    email: clean,
    password,
    name,
    createdAt: serverTimestamp(),
  })
  console.log(`Created admin ${clean} (doc ${ref.id})`)
}

const after = await getDocs(collection(db, 'admins'))
console.log(`admins collection now holds ${after.size} account(s):`)
after.docs.forEach((d) => console.log(`  - ${d.data().email}  (${d.data().name || 'Admin'})`))
process.exit(0)
