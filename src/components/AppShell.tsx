import { NavLink, Outlet } from 'react-router-dom'
import { AddTransactionFab } from '../features/transactions/AddTransactionFab'
import { useDueRecurring } from '../features/transactions/useDueRecurring'

const NAV_ITEMS = [
  { to: '/transactions', label: 'รายการ', icon: '📝' },
  { to: '/accounts', label: 'บัญชี', icon: '💰' },
  { to: '/reports', label: 'รายงาน', icon: '📊' },
  { to: '/analysis', label: 'วิเคราะห์', icon: '📈' },
  { to: '/budget', label: 'งบประมาณ', icon: '🎯' },
  { to: '/settings', label: 'ตั้งค่า', icon: '⚙️' },
]

export function AppShell() {
  const { pendingCount } = useDueRecurring()

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
        {pendingCount > 0 && (
          <NavLink to="/recurring" className="banner-info" style={{ display: 'block', textDecoration: 'none' }}>
            มีรายการประจำรอยืนยัน {pendingCount} รายการ — แตะเพื่อดู
          </NavLink>
        )}
        <Outlet />
      </main>

      <AddTransactionFab />

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
