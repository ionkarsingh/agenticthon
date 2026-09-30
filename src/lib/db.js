import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../firebase.js'
import { COL } from './constants.js'

const snapToArr = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))
const byCode = (a, b) =>
  String(a.code || '').localeCompare(String(b.code || ''), undefined, { numeric: true })

/* ------------------------------- admin ---------------------------------- */

/**
 * Authenticates against the Firestore `admins` collection.
 * Returns the admin profile, or throws with a message the login form shows.
 */
export async function verifyAdmin(email, password) {
  const clean = String(email || '').trim().toLowerCase()

  const snap = await getDocs(query(collection(db, COL.admins), where('email', '==', clean)))
  if (snap.empty) return null

  const match = snapToArr(snap).find((a) => String(a.password) === String(password))
  return match ? { email: match.email, name: match.name || 'Admin' } : null
}

export async function listAdmins() {
  return snapToArr(await getDocs(collection(db, COL.admins)))
}

export async function addAdmin({ email, password, name }) {
  return addDoc(collection(db, COL.admins), {
    email: email.trim().toLowerCase(),
    password,
    name: name || 'Admin',
    createdAt: serverTimestamp(),
  })
}

export async function deleteAdmin(id) {
  return deleteDoc(doc(db, COL.admins, id))
}

/* ----------------------------- categories -------------------------------- */

export async function listCategories() {
  const snap = await getDocs(collection(db, COL.categories))
  return snapToArr(snap).sort((a, b) => (a.order || 0) - (b.order || 0))
}

/** Next sequential category ID, e.g. CAT-001. */
export async function nextCategoryCode() {
  const cats = await listCategories()
  const nums = cats
    .map((c) => Number(String(c.code || '').replace(/\D/g, '')))
    .filter((n) => !Number.isNaN(n) && n > 0)
  const max = nums.length ? Math.max(...nums) : 0
  return 'CAT-' + String(max + 1).padStart(3, '0')
}

export async function saveCategory(id, data) {
  if (id) return updateDoc(doc(db, COL.categories, id), data)
  return addDoc(collection(db, COL.categories), { ...data, createdAt: serverTimestamp() })
}

export async function deleteCategory(id) {
  const problems = await listProblems(id)
  const batch = writeBatch(db)
  problems.forEach((p) => {
    if (p.assignedTeamId) {
      batch.update(doc(db, COL.teams, p.assignedTeamId), {
        problemId: null,
        problemTitle: null,
        problemCode: null,
      })
    }
    batch.delete(doc(db, COL.problems, p.id))
  })
  batch.delete(doc(db, COL.categories, id))
  await batch.commit()
}

/* ------------------------------ problems --------------------------------- */

export async function listProblems(categoryId) {
  const ref = collection(db, COL.problems)
  const q = categoryId ? query(ref, where('categoryId', '==', categoryId)) : ref
  return snapToArr(await getDocs(q)).sort(byCode)
}

/** Highest numeric suffix used by any PS code, across every category. */
async function highestProblemNumber() {
  const all = await listProblems()
  const nums = all
    .map((p) => Number(String(p.code || '').replace(/\D/g, '')))
    .filter((n) => !Number.isNaN(n) && n > 0)
  return nums.length ? Math.max(...nums) : 0
}

/** Next sequential PS ID, unique across all categories, e.g. PS-001. */
export async function nextProblemCode() {
  return 'PS-' + String((await highestProblemNumber()) + 1).padStart(3, '0')
}

export async function saveProblem(id, data) {
  if (!id) {
    return addDoc(collection(db, COL.problems), {
      assignedTeamId: null,
      assignedTeamCode: null,
      ...data,
      createdAt: serverTimestamp(),
    })
  }

  const ref = doc(db, COL.problems, id)
  const current = (await getDoc(ref)).data() || {}
  const merged = { ...current, ...data }

  const batch = writeBatch(db)
  batch.update(ref, data)

  // A team holding this statement keeps its own copy of the code and title so
  // the lists stay fast — push the edit through so that copy can't go stale.
  if (current.assignedTeamId) {
    batch.update(doc(db, COL.teams, current.assignedTeamId), {
      problemCode: merged.code ?? null,
      problemTitle: merged.title ?? null,
    })
  }

  await batch.commit()
  return ref
}

export async function deleteProblem(id) {
  const snap = await getDoc(doc(db, COL.problems, id))
  const data = snap.data()
  const batch = writeBatch(db)
  if (data?.assignedTeamId) {
    batch.update(doc(db, COL.teams, data.assignedTeamId), {
      problemId: null,
      problemTitle: null,
      problemCode: null,
    })
  }
  batch.delete(doc(db, COL.problems, id))
  await batch.commit()
}

/**
 * Bulk import problem statements from a parsed JSON array.
 * Accepted item keys: code|id, title|statement|problem|name, description|details|desc
 */
export async function importProblems(categoryId, items) {
  // Continue the global PS numbering so codes stay unique across categories.
  let next = await highestProblemNumber()
  const batch = writeBatch(db)

  items.forEach((raw) => {
    next += 1
    batch.set(doc(collection(db, COL.problems)), {
      categoryId,
      code: String(raw.code ?? raw.id ?? 'PS-' + String(next).padStart(3, '0')),
      title: String(raw.title ?? raw.statement ?? raw.problem ?? raw.name ?? '').trim(),
      description: String(raw.description ?? raw.details ?? raw.desc ?? '').trim(),
      assignedTeamId: null,
      assignedTeamCode: null,
      createdAt: serverTimestamp(),
    })
  })

  await batch.commit()
  return items.length
}

/* -------------------------- assignment (atomic) --------------------------- */

/** Assign a problem to a team, releasing any previous links on both sides. */
export async function assignProblemToTeam(problem, teamId) {
  // Read the statement fresh: the caller's copy may predate an edit made
  // elsewhere, and its title is what gets denormalised onto the team.
  const problemRef = doc(db, COL.problems, problem.id)
  const fresh = { ...problem, ...((await getDoc(problemRef)).data() || {}) }

  const batch = writeBatch(db)

  // Release the team currently holding this problem.
  if (fresh.assignedTeamId && fresh.assignedTeamId !== teamId) {
    batch.update(doc(db, COL.teams, fresh.assignedTeamId), {
      problemId: null,
      problemTitle: null,
      problemCode: null,
    })
  }

  if (!teamId) {
    batch.update(problemRef, { assignedTeamId: null, assignedTeamCode: null })
    await batch.commit()
    return
  }

  const teamSnap = await getDoc(doc(db, COL.teams, teamId))
  const team = teamSnap.data()

  // Release the problem the incoming team was previously holding.
  if (team?.problemId && team.problemId !== problem.id) {
    batch.update(doc(db, COL.problems, team.problemId), {
      assignedTeamId: null,
      assignedTeamCode: null,
    })
  }

  batch.update(problemRef, {
    assignedTeamId: teamId,
    assignedTeamCode: team?.code || null,
  })
  batch.update(doc(db, COL.teams, teamId), {
    problemId: problem.id,
    problemTitle: fresh.title || null,
    problemCode: fresh.code || null,
  })

  await batch.commit()
}

/** Change (or clear) the problem held by a given team — used from the Teams page. */
export async function setTeamProblem(team, problemId) {
  const batch = writeBatch(db)

  if (team.problemId && team.problemId !== problemId) {
    batch.update(doc(db, COL.problems, team.problemId), {
      assignedTeamId: null,
      assignedTeamCode: null,
    })
  }

  if (!problemId) {
    batch.update(doc(db, COL.teams, team.id), {
      problemId: null,
      problemTitle: null,
      problemCode: null,
    })
    await batch.commit()
    return
  }

  const pSnap = await getDoc(doc(db, COL.problems, problemId))
  const problem = pSnap.data()

  if (problem?.assignedTeamId && problem.assignedTeamId !== team.id) {
    batch.update(doc(db, COL.teams, problem.assignedTeamId), {
      problemId: null,
      problemTitle: null,
      problemCode: null,
    })
  }

  batch.update(doc(db, COL.problems, problemId), {
    assignedTeamId: team.id,
    assignedTeamCode: team.code || null,
  })
  batch.update(doc(db, COL.teams, team.id), {
    problemId,
    problemTitle: problem?.title || null,
    problemCode: problem?.code || null,
  })

  await batch.commit()
}

/* -------------------------------- teams ---------------------------------- */

export async function listTeams() {
  return snapToArr(await getDocs(collection(db, COL.teams))).sort(byCode)
}

export async function nextTeamCode() {
  const teams = await listTeams()
  const nums = teams
    .map((t) => Number(String(t.code || '').replace(/\D/g, '')))
    .filter((n) => !Number.isNaN(n) && n > 0)
  const max = nums.length ? Math.max(...nums) : 0
  return 'AGT-' + String(max + 1).padStart(3, '0')
}

export async function saveTeam(id, data) {
  // `memberEmails` is a flat array so participant login can query it with array-contains.
  const payload = {
    ...data,
    memberEmails: (data.members || [])
      .map((m) => String(m?.email || '').trim().toLowerCase())
      .filter(Boolean),
  }

  if (id) {
    await updateDoc(doc(db, COL.teams, id), payload)
    return id
  }
  const ref = await addDoc(collection(db, COL.teams), {
    problemId: null,
    problemTitle: null,
    problemCode: null,
    ...payload,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

/* ---------------------------- participant side ---------------------------- */

/** Authenticates a participant against the member accounts on a team. */
export async function verifyParticipant(email, password) {
  const clean = String(email || '').trim().toLowerCase()
  const snap = await getDocs(
    query(collection(db, COL.teams), where('memberEmails', 'array-contains', clean)),
  )
  if (snap.empty) return null

  const team = snapToArr(snap)[0]
  const member = (team.members || []).find(
    (m) => String(m?.email || '').toLowerCase() === clean && String(m?.password) === String(password),
  )
  if (!member) return null

  return { email: member.email, teamId: team.id, teamCode: team.code }
}

export async function getTeam(teamId) {
  const snap = await getDoc(doc(db, COL.teams, teamId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

/**
 * Locks a problem statement for a team. Runs in a transaction so two teams
 * clicking the same statement at the same moment cannot both win it.
 * Throws with a participant-facing message when the lock is not possible.
 */
export async function lockProblemForTeam(teamId, problemId) {
  return runTransaction(db, async (tx) => {
    const teamRef = doc(db, COL.teams, teamId)
    const problemRef = doc(db, COL.problems, problemId)

    const [teamSnap, problemSnap] = await Promise.all([tx.get(teamRef), tx.get(problemRef)])
    if (!teamSnap.exists()) throw new Error('Your team could not be found.')
    if (!problemSnap.exists()) throw new Error('That problem statement no longer exists.')

    const team = teamSnap.data()
    const problem = problemSnap.data()

    if (team.problemId) {
      throw new Error('Your team has already locked a problem statement. It cannot be changed.')
    }
    if (problem.assignedTeamId) {
      throw new Error('Another team just locked this problem statement. Please choose a different one.')
    }

    tx.update(problemRef, { assignedTeamId: teamId, assignedTeamCode: team.code || null })
    tx.update(teamRef, {
      problemId,
      problemCode: problem.code || null,
      problemTitle: problem.title || null,
      lockedAt: serverTimestamp(),
    })

    return { code: problem.code, title: problem.title }
  })
}

export async function deleteTeam(id) {
  const snap = await getDoc(doc(db, COL.teams, id))
  const data = snap.data()
  const batch = writeBatch(db)
  if (data?.problemId) {
    batch.update(doc(db, COL.problems, data.problemId), {
      assignedTeamId: null,
      assignedTeamCode: null,
    })
  }
  batch.delete(doc(db, COL.teams, id))
  await batch.commit()
}
