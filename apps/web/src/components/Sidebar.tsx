import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { canManageBranches, canViewReports, canManageProducts } from '../lib/roles'
import type { Role } from '../lib/roles'

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const role = (user?.role || 'CASHIER') as Role

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const nav = [
    { to: '/', icon: '▦', label: 'Dashboard', show: true },
    { to: '/products', icon: '⊞', label: 'Produk', show: true },
    { to: '/categories', icon: '◈', label: 'Kategori', show: canManageProducts(role) },
    { to: '/branches', icon: '⊕', label: 'Cabang', show: canManageBranches(role) },
    { to: '/transactions', icon: '⊟', label: 'Transaksi', show: true },
    { to: '/reports', icon: '◎', label: 'Laporan', show: canViewReports(role) },
  ]

  return (
    <aside style={{
      width: 'var(--sidebar-w)',
      background: 'var(--bg-card)',
      borderRight: '1px solid var(--border)',
      height: '100vh',
      position: 'fixed',
      left: 0, top: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      zIndex: 100
    }}>
      {/* Logo */}
      <div style={{ padding: '0 24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'var(--accent)',
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18
          }}>◈</div>
          <div>
            <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: 16 }}>POS System</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Management</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 12px' }}>
        {nav.filter(n => n.show).map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 14px',
              borderRadius: 10,
              marginBottom: 4,
              textDecoration: 'none',
              color: isActive ? 'white' : 'var(--text-muted)',
              background: isActive ? 'var(--accent)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: 14,
              transition: 'all 0.15s'
            })}
          >
            <span style={{ fontSize: 16 }}>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.role}</div>
          {user?.branch && (
            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 2 }}>
              {user.branch.name}
            </div>
          )}
        </div>
        <button className="btn-ghost" onClick={handleLogout} style={{ width: '100%', fontSize: 13 }}>
          ⎋ Logout
        </button>
      </div>
    </aside>
  )
}