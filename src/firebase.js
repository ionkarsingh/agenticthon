import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

// import.meta.env exists under Vite; process.env is the fallback for Node
// scripts (seeding, migrations, tests) so both run against one config.
const src = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : process.env

const firebaseConfig = {
  apiKey: src.VITE_FIREBASE_API_KEY,
  authDomain: src.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: src.VITE_FIREBASE_PROJECT_ID,
  storageBucket: src.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: src.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: src.VITE_FIREBASE_APP_ID,
}

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId)

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
