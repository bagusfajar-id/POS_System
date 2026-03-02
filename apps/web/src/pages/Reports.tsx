import { useEffect, useState, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import api from '../lib/api'
import { formatRupiah } from '../lib/utils'

interface TopProduct { id: string; name: string; qty: number; revenue: number }
interface DailyReport {
  date: string
  totalRevenue: number
  totalTransactions: number
  totalItems: number
  topProducts: TopProduct[]
}
interface DailySummaryItem { revenue: number; transactions: number }
interface MonthlyReport {
  month: string
  totalRevenue: number
  totalTransactions: number
  dailySummary: Record<string, DailySummaryItem>
}

export default function Reports() {
  const [daily, setDaily] = useState<DailyReport | null>(null)
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [loading, setLoading] = useState(false)

  const loadDaily = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<DailyReport>('/reports/daily', { params: { date } })
      setDaily(data)
    } finally { setLoading(false) }
  }, [date])

  const loadMonthly = useCallback(async () => {
    const { data } = await api.get<MonthlyReport>('/reports/monthly', { params: { month } })
    setMonthly(data)
  }, [month])

  useEffect(() => { loadDaily(); loadMonthly() }, [loadDaily, loadMonthly])

  const chartData = monthly?.dailySummary
    ? Object.entries(monthly.dailySummary).map(([d, v]) => ({
        date: d.slice(8),
        revenue: Math.round(v.revenue),
        trx: v.transactions
      }))
    : []

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Laporan</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Analitik penjualan</p>
      </div>

      <div className="glass" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Laporan Harian</h2>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: 160 }} />
            <button className="btn-primary" onClick={loadDaily}>Lihat</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : daily && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
              {([
                { label: 'Total Pendapatan', value: formatRupiah(daily.totalRevenue), color: 'var(--accent)' },
                { label: 'Jumlah Transaksi', value: String(daily.totalTransactions), color: 'var(--accent-3)' },
                { label: 'Total Item Terjual', value: String(daily.totalItems), color: 'var(--accent-2)' },
              ] as { label: string; value: string; color: string }[]).map(({ label, value, color }) => (
                <div key={label} style={{ background: 'var(--bg)', borderRadius: 12, padding: 20, borderLeft: `3px solid ${color}` }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Syne' }}>{value}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Top 10 Produk Terlaris</h3>
            <table>
              <thead><tr><th>#</th><th>Produk</th><th>Qty Terjual</th><th>Revenue</th></tr></thead>
              <tbody>
                {daily.topProducts?.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>Tidak ada data</td></tr>
                )}
                {daily.topProducts?.map((p, i) => (
                  <tr key={p.id}>
                    <td style={{ color: 'var(--text-muted)', width: 40 }}>
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td><span className="badge badge-blue">{p.qty} unit</span></td>
                    <td style={{ fontWeight: 600 }}>{formatRupiah(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div className="glass" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Tren Bulanan</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
              Total: {formatRupiah(monthly?.totalRevenue || 0)} · {monthly?.totalTransactions || 0} transaksi
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} style={{ width: 160 }} />
            <button className="btn-primary" onClick={loadMonthly}>Lihat</button>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
                contentStyle={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 10, fontSize: 12 }}
                formatter={(v) => [formatRupiah(Number(v)), 'Revenue']}
              />
            <Bar dataKey="revenue" fill="var(--accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}