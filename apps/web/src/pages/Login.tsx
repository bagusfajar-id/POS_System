import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { AxiosError } from 'axios'

interface LoginResponse {
  token: string
  refreshToken: string
  user: { id: string; name: string; email: string; role: string; branch?: { id: string; name: string } }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', { email, password })
      setAuth(data.user, data.token, data.refreshToken)
      navigate('/')
    } catch (err) {
      const axiosErr = err as AxiosError<{ error: string }>
      setError(axiosErr.response?.data?.error || 'Login gagal')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(108,99,255,0.15) 0%, transparent 70%)',
        top: -100, left: -100, pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(255,101,132,0.1) 0%, transparent 70%)',
        bottom: -50, right: -50, pointerEvents: 'none'
      }} />

      <div className="glass fade-in" style={{ width: 420, padding: 40, position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 56, height: 56, background: 'var(--accent)', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, margin: '0 auto 16px'
          }}>◈</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>POS System</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Masuk ke dashboard manajemen</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label>Email</label>
            <input type="email" placeholder="admin@pos.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && (
            <div style={{
              background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.3)',
              color: '#ff4757', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16
            }}>{error}</div>
          )}

          <button className="btn-primary" type="submit" disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
            {loading ? <span className="spinner" /> : '→ Masuk'}
          </button>
        </form>

        <div style={{
          marginTop: 24, padding: 16,
          background: 'rgba(108,99,255,0.05)',
          borderRadius: 10, border: '1px solid rgba(108,99,255,0.1)'
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Demo credentials:</div>
          <div style={{ fontSize: 12 }}>📧 admin@pos.com / <span style={{ color: 'var(--accent)' }}>admin123</span></div>
          <div style={{ fontSize: 12 }}>📧 kasir@pos.com / <span style={{ color: 'var(--accent)' }}>kasir123</span></div>
        </div>
      </div>
    </div>
  )
}