import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '▤' },
  { to: '/admin/problems', label: 'Problem Statements', icon: '◈' },
  { to: '/admin/teams', label: 'Teams / Accounts', icon: '◎' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙' },
]

export default function Layout() {
  const { admin } = useAuth()
  const initials = (admin?.name || admin?.email || 'A').slice(0, 1).toUpperCase()

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand__mark">A</div>
          <div>
            <div className="brand__name">Agenticthon</div>
            <div className="brand__sub">Admin Console</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav__item${isActive ? ' is-active' : ''}`}>
              <span className="nav__icon">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__foot">
          <div className="avatar">{initials}</div>
          <div className="sidebar__who">
            <strong>{admin?.name || 'Admin'}</strong>
            <span>{admin?.email}</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
