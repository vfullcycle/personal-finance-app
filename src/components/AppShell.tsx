import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/accounts', label: 'บัญชี', icon: '💰' },
  { to: '/categories', label: 'หมวดหมู่', icon: '🗂️' },
  { to: '/settings', label: 'ตั้งค่า', icon: '⚙️' },
]

export function AppShell() {
  return (
    <div className="app-shell">
      <nav className="app-sidebar">
        <div className="app-sidebar-title">การเงินส่วนบุคคล</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `app-sidebar-link${isActive ? ' active' : ''}`}
          >
            <span aria-hidden="true">{item.icon}</span> {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="app-content">
        <Outlet />
      </main>

      <nav className="app-bottom-nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `app-bottom-nav-link${isActive ? ' active' : ''}`}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
