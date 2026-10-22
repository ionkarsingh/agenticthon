import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import PortalLayout from './components/PortalLayout'
import { useAuth } from './context/AuthContext'
import { useParticipant } from './context/ParticipantContext'
import Admins from './pages/Admins'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Problems from './pages/Problems'
import Settings from './pages/Settings'
import Teams from './pages/Teams'
import PortalLogin from './pages/portal/Login'
import PortalCategories from './pages/portal/Categories'
import CategoryProblems from './pages/portal/CategoryProblems'
import ProblemDetail from './pages/portal/ProblemDetail'

function AdminOnly({ children }) {
  const { admin, ready } = useAuth()
  if (!ready) return <div className="boot">Loading…</div>
  if (!admin) return <Navigate to="/admin/login" replace />
  return children
}

function ParticipantOnly({ children }) {
  const { user, ready } = useParticipant()
  if (!ready) return <div className="boot">Loading…</div>
  if (!user) return <Navigate to="/participant/login" replace />
  return children
}

export default function App() {
  const { admin } = useAuth()
  const { user, ready: pReady } = useParticipant()

  return (
    <Routes>
      {/* Bare domain — where the QR code points. */}
      <Route
        path="/"
        element={<Navigate to={pReady && user ? '/participant/portal' : '/participant/login'} replace />}
      />

      {/* ------------------------- participant portal ------------------------ */}
      <Route
        path="/participant/login"
        element={pReady && user ? <Navigate to="/participant/portal" replace /> : <PortalLogin />}
      />
      <Route
        path="/participant/portal"
        element={
          <ParticipantOnly>
            <PortalLayout />
          </ParticipantOnly>
        }
      >
        <Route index element={<PortalCategories />} />
        <Route path="category/:categoryId" element={<CategoryProblems />} />
        <Route path="problem/:problemId" element={<ProblemDetail />} />
      </Route>
      <Route path="/participant" element={<Navigate to="/participant/portal" replace />} />

      {/* ------------------------------ admin -------------------------------- */}
      <Route path="/admin/login" element={admin ? <Navigate to="/admin/dashboard" replace /> : <Login />} />
      <Route
        path="/admin"
        element={
          <AdminOnly>
            <Layout />
          </AdminOnly>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="problems" element={<Problems />} />
        <Route path="teams" element={<Teams />} />
        <Route path="admins" element={<Admins />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
