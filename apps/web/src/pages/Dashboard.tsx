import { useEffect, useState, useCallback } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../lib/api'
import { formatRupiah, formatDate } from '../lib/utils'
import StatCard from '../components/StatCard'
import { useAuthStore } from '../store/authStore'

interface RecentTransaction {
  id: string
  invoiceNo: string
  total: number
  createdAt: string
  user?: { name: string }
  branch?: { name: string }
}

interface MonthlyData {
  month: string
  revenue: number
  transactions: number
}

interface Summary {
  todayRevenue: number
  todayTransactions: number
  totalProducts: number
  lowStockProducts: number
  totalBranches: number
  recentTransactions: RecentTransaction[]
  monthlyData?: MonthlyData[]
}

export default function Dashboard() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      // Kirim branchId hanya kalau bukan SUPER_ADMIN/ADMIN
      if (user?.role === 'MANAGER' || user?.role === 'CASHIER') {
        if (user?.branch?.id) params.append('branchId', user.branch.id)
      }

      const { data } = await api.get<Summary>(
        `/reports/summary${params.toString() ? '?' + params.toString() : ''}`
      )
      setSummary(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { load() }, [load])

  // Pakai monthlyData dari summary (6 bulan), fallback ke empty
  const chartData: MonthlyData[] = summary?.monthlyData || []

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          {new Intl.DateTimeFormat('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          }).format(new Date())}
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard
          label="Pendapatan Hari Ini"
          value={formatRupiah(summary?.todayRevenue || 0)}
          icon="💰"
          color="var(--accent)"
        />
        <StatCard
          label="Transaksi Hari Ini"
          value={String(summary?.todayTransactions || 0)}
          icon="🧾"
          color="var(--accent-3)"
          sub="transaksi selesai"
        />
        <StatCard
          label="Total Produk"
          value={String(summary?.totalProducts || 0)}
          icon="📦"
          color="#43e97b"
        />
        <StatCard
          label="Stok Menipis"
          value={String(summary?.lowStockProducts || 0)}
          icon="⚠️"
          color="var(--accent-2)"
          sub="produk ≤ 5 unit"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16 }}>
        {/* Chart 6 bulan */}
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Pendapatan Bulanan</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Total 6 bulan: {formatRupiah(
                chartData.reduce((sum, d) => sum + d.revenue, 0)
              )}
            </p>
          </div>

          {chartData.length === 0 ? (
            <div style={{
              height: 220, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: 'var(--text-muted)', fontSize: 14
            }}>
              Belum ada data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6c63ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6c63ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#6b6b80', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#6b6b80', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    background: '#111118',
                    border: '1px solid #1e1e2e',
                    borderRadius: 10,
                    fontSize: 12
                  }}
                  formatter={(v) => [formatRupiah(Number(v)), 'Revenue']}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#6c63ff"
                  strokeWidth={2}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="glass" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Transaksi Terbaru</h2>

          {!summary?.recentTransactions?.length ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Belum ada transaksi</p>
          ) : (
            summary.recentTransactions.map((t) => (
              <div key={t.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0', borderBottom: '1px solid var(--border)'
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{t.invoiceNo}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {t.user?.name} · {t.branch?.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-3)' }}>
                    {formatRupiah(t.total)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {formatDate(t.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}