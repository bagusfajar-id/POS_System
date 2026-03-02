import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import Sidebar from './Sidebar'
import { canManageBranches, canViewReports, canManageProducts } from '../lib/roles'
import type { Role } from '../lib/roles'

export default function Layout() {
  const { isAuthenticated, user } = useAuthStore()
  const location = useLocation()
  const role = (user?.role || 'CASHIER') as Role

  if (!isAuthenticated()) return <Navigate to="/login" replace />

  if (location.pathname === '/reports' && !canViewReports(role)) {
    return <Navigate to="/" replace />
  }
  if (location.pathname === '/branches' && !canManageBranches(role)) {
    return <Navigate to="/" replace />
  }
  if (location.pathname === '/categories' && !canManageProducts(role)) {
    return <Navigate to="/" replace />
  }

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar />
      <main style={{
        marginLeft: 'var(--sidebar-w)',
        flex: 1,
        minHeight: '100vh',
        padding: '32px',
        maxWidth: 'calc(100vw - var(--sidebar-w))'
      }}>
        <Outlet />
      </main>
    </div>
  )
}