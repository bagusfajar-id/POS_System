import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'
import api from '../lib/api'
import { formatRupiah } from '../lib/utils'

interface TopProduct { id: string; name: string; qty: number; revenue: number }
interface DailyReport {
  date: string; totalRevenue: number; totalTransactions: number
  totalItems: number; topProducts: TopProduct[]
}
interface DailySummaryItem { revenue: number; transactions: number }
interface MonthlyReport {
  month: string; totalRevenue: number; totalTransactions: number
  dailySummary: Record<string, DailySummaryItem>
}
interface ProfitLoss {
  period: string; label: string
  grossSubtotal: number; totalDiscount: number; totalTax: number
  grossRevenue: number; revenueAfterDiscount: number
  grossProfit: number; grossProfitMargin: number
  netProfit: number; netProfitMargin: number
  totalTransactions: number; avgTransactionValue: number
  revenueGrowth: number; prevRevenue: number
  paymentBreakdown: Record<string, { count: number; total: number }>
  topProducts: TopProduct[]
  timeline: Record<string, { revenue: number; transactions: number }>
}
interface CashierStat {
  id: string; name: string; transactions: number
  revenue: number; items: number; avgTransaction: number
}
interface CashierPerformance { period: string; cashiers: CashierStat[] }

type Period = 'daily' | 'weekly' | 'monthly'
type MainTab = 'daily' | 'monthly' | 'pl' | 'cashier'

const COLORS = ['#6c63ff', '#43e97b', '#f093fb', '#4facfe', '#f5a623', '#ff4757']
const paymentLabels: Record<string, string> = {
  CASH: '💵 Tunai', QRIS: '📱 QRIS', TRANSFER: '🏦 Transfer', CARD: '💳 Kartu'
}

const tooltipStyle = {
  contentStyle: {
    background: '#111118',
    border: '1px solid #2a2a3e',
    borderRadius: 10,
    fontSize: 12,
    color: '#e8e8f0',
  },
  labelStyle: { color: '#e8e8f0', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#a78bfa' },
  cursor: { fill: 'rgba(108,99,255,0.08)' },
}

function MetricCard({ label, value, sub, color = 'var(--accent)', trend }: {
  label: string; value: string; sub?: string; color?: string; trend?: number
}) {
  return (
    <div style={{
      background: 'var(--bg)', borderRadius: 14, padding: '18px 20px',
      borderLeft: `3px solid ${color}`, position: 'relative', overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute', top: -16, right: -16, width: 80, height: 80,
        background: color, borderRadius: '50%', opacity: 0.06
      }} />
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'Syne', marginBottom: sub ? 4 : 0 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
      {trend !== undefined && (
        <div style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: trend >= 0 ? '#43e97b' : '#ff4757' }}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(1)}% vs periode lalu
        </div>
      )}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 12, fontWeight: 700, color: 'var(--text-muted)',
      letterSpacing: 1, textTransform: 'uppercase', marginBottom: 14,
      paddingBottom: 8, borderBottom: '1px solid var(--border)',
    }}>
      {children}
    </div>
  )
}

function PeriodSelector({ value, onChange }: { value: Period; onChange: (p: Period) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 4,
      background: 'var(--bg)', borderRadius: 10, padding: 4,
      border: '1px solid var(--border)'
    }}>
      {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
        <button key={p} onClick={() => onChange(p)} style={{
          padding: '6px 14px', borderRadius: 7, border: 'none',
          cursor: 'pointer', fontSize: 12, fontWeight: 600,
          background: value === p ? 'var(--accent)' : 'transparent',
          color: value === p ? 'white' : 'var(--text-muted)',
          transition: 'all 0.15s'
        }}>
          {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
        </button>
      ))}
    </div>
  )
}

export default function Reports() {
  const [daily, setDaily] = useState<DailyReport | null>(null)
  const [monthly, setMonthly] = useState<MonthlyReport | null>(null)
  const [profitLoss, setProfitLoss] = useState<ProfitLoss | null>(null)
  const [cashierPerf, setCashierPerf] = useState<CashierPerformance | null>(null)

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [plPeriod, setPlPeriod] = useState<Period>('monthly')
  const [plDate, setPlDate] = useState(new Date().toISOString().slice(0, 10))
  const [plMonth, setPlMonth] = useState(new Date().toISOString().slice(0, 7))

  const [loadingDaily, setLoadingDaily] = useState(false)
  const [loadingPL, setLoadingPL] = useState(false)
  const [activeTab, setActiveTab] = useState<MainTab>('daily')

  const loadDaily = useCallback(async () => {
    setLoadingDaily(true)
    try {
      const { data } = await api.get<DailyReport>('/reports/daily', { params: { date } })
      setDaily(data)
    } finally { setLoadingDaily(false) }
  }, [date])

  const loadMonthly = useCallback(async () => {
    const { data } = await api.get<MonthlyReport>('/reports/monthly', { params: { month } })
    setMonthly(data)
  }, [month])

  const loadProfitLoss = useCallback(async () => {
    setLoadingPL(true)
    try {
      const params: Record<string, string> = { period: plPeriod }
      if (plPeriod === 'monthly') params.month = plMonth
      else params.date = plDate
      const { data } = await api.get<ProfitLoss>('/reports/profit-loss', { params })
      setProfitLoss(data)
    } finally { setLoadingPL(false) }
  }, [plPeriod, plDate, plMonth])

  const loadCashier = useCallback(async () => {
    const params: Record<string, string> = { period: plPeriod }
    if (plPeriod === 'monthly') params.month = plMonth
    else params.date = plDate
    const { data } = await api.get<CashierPerformance>('/reports/cashier-performance', { params })
    setCashierPerf(data)
  }, [plPeriod, plDate, plMonth])

  useEffect(() => { loadDaily() }, [loadDaily])
  useEffect(() => { loadMonthly() }, [loadMonthly])
  useEffect(() => { loadProfitLoss(); loadCashier() }, [loadProfitLoss, loadCashier])

  const monthlyChartData = (() => {
    if (!monthly?.dailySummary) return []
    const [year, monthNum] = month.split('-').map(Number)
    const daysInMonth = new Date(year, monthNum, 0).getDate()
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, '0')
      const key = `${month}-${day}`
      const val = monthly.dailySummary[key]
      return { date: String(i + 1), revenue: val ? Math.round(val.revenue) : 0, trx: val ? val.transactions : 0 }
    })
  })()

  const timelineData = profitLoss
    ? Object.entries(profitLoss.timeline)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => ({ label: key, revenue: Math.round(val.revenue), trx: val.transactions }))
    : []

  const paymentChartData = profitLoss
    ? Object.entries(profitLoss.paymentBreakdown).map(([method, data]) => ({
        name: paymentLabels[method] || method,
        value: data.total, count: data.count
      }))
    : []

  const tabs = [
    { id: 'daily', label: '📅 Harian' },
    { id: 'monthly', label: '📊 Bulanan' },
    { id: 'pl', label: '💰 Laba Rugi' },
    { id: 'cashier', label: '👤 Performa Kasir' },
  ] as const

  const PLFilter = ({ compact = false }: { compact?: boolean }) => (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'center',
      flexWrap: 'wrap', marginBottom: compact ? 0 : 20
    }}>
      <PeriodSelector value={plPeriod} onChange={setPlPeriod} />
      {plPeriod === 'monthly' ? (
        <input type="month" value={plMonth} onChange={e => setPlMonth(e.target.value)}
          style={{ width: 160, colorScheme: 'dark' }} />
      ) : (
        <input type="date" value={plDate} onChange={e => setPlDate(e.target.value)}
          style={{ width: 160, colorScheme: 'dark' }} />
      )}
      <button className="btn-primary" onClick={() => { loadProfitLoss(); loadCashier() }}>Lihat</button>
      {profitLoss && (
        <span style={{
          fontSize: 13, color: 'var(--text-muted)',
          background: 'var(--bg)', padding: '6px 12px',
          borderRadius: 8, border: '1px solid var(--border)'
        }}>📅 {profitLoss.label}</span>
      )}
    </div>
  )

  return (
    <div className="fade-in">
      <style>{`
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="month"]::-webkit-calendar-picker-indicator {
          filter: invert(1); opacity: 0.6; cursor: pointer;
        }
        input[type="date"]::-webkit-calendar-picker-indicator:hover,
        input[type="month"]::-webkit-calendar-picker-indicator:hover { opacity: 1; }
      `}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Laporan</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>Analitik & performa bisnis</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 18px', borderRadius: '8px 8px 0 0',
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
            color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
            borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
            transition: 'all 0.15s'
          }}>{tab.label}</button>
        ))}
      </div>

      {/* TAB: HARIAN */}
      {activeTab === 'daily' && (
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Laporan Harian</h2>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: 160, colorScheme: 'dark' }} />
              <button className="btn-primary" onClick={loadDaily}>Lihat</button>
            </div>
          </div>
          {loadingDaily ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : daily && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                <MetricCard label="Total Pendapatan" value={formatRupiah(daily.totalRevenue)} color="var(--accent)" />
                <MetricCard label="Jumlah Transaksi" value={String(daily.totalTransactions)} sub="transaksi selesai" color="var(--accent-3)" />
                <MetricCard label="Total Item Terjual" value={String(daily.totalItems)} sub="unit terjual" color="var(--accent-2)" />
              </div>
              <SectionTitle>🏆 Top 10 Produk Terlaris</SectionTitle>
              <table>
                <thead><tr><th style={{ width: 40 }}>#</th><th>Produk</th><th>Qty Terjual</th><th>Revenue</th></tr></thead>
                <tbody>
                  {daily.topProducts?.length === 0 && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Tidak ada data</td></tr>
                  )}
                  {daily.topProducts?.map((p, i) => (
                    <tr key={p.id}>
                      <td>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
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
      )}

      {/* TAB: BULANAN */}
      {activeTab === 'monthly' && (
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Tren Bulanan</h2>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                Total: {formatRupiah(monthly?.totalRevenue || 0)} · {monthly?.totalTransactions || 0} transaksi
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)}
                style={{ width: 160, colorScheme: 'dark' }} />
              <button className="btn-primary" onClick={loadMonthly}>Lihat</button>
            </div>
          </div>
          <SectionTitle>📊 Revenue per Hari</SectionTitle>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyChartData} barCategoryGap="40%" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
              <YAxis tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip {...tooltipStyle} formatter={(v) => [formatRupiah(Number(v)), 'Revenue']} labelFormatter={(l) => `Tanggal ${l}`} />
              <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div style={{ marginTop: 28 }}>
            <SectionTitle>📈 Jumlah Transaksi per Hari</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false} interval={1} />
                <YAxis tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} formatter={(v) => [v, 'Transaksi']} labelFormatter={(l) => `Tanggal ${l}`} />
                <Line type="monotone" dataKey="trx" stroke="#43e97b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB: LABA RUGI */}
      {activeTab === 'pl' && (
        <div>
          <PLFilter />
          {loadingPL ? (
            <div style={{ textAlign: 'center', padding: 60 }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : profitLoss && (
            <>
              {/* Ringkasan Pendapatan */}
              <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <SectionTitle>📈 Ringkasan Pendapatan</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <MetricCard label="Subtotal Penjualan" value={formatRupiah(profitLoss.grossSubtotal)}
                    sub="sebelum diskon & pajak" color="var(--accent)" />
                  <MetricCard label="Total Diskon" value={`- ${formatRupiah(profitLoss.totalDiscount)}`}
                    sub="potongan harga" color="#ff4757" />
                  <MetricCard label="Total Pajak (11%)" value={formatRupiah(profitLoss.totalTax)}
                    sub="disetor ke negara" color="#f5a623" />
                  <MetricCard label="Total Diterima" value={formatRupiah(profitLoss.grossRevenue)}
                    sub="kas masuk" color="#43e97b" trend={profitLoss.revenueGrowth} />
                </div>
              </div>

              {/* L/R + Pie */}
              <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <SectionTitle>💰 Laporan Laba Rugi</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                  {/* Tabel L/R */}
                  <div>
                    {[
                      { label: 'Subtotal Penjualan', value: profitLoss.grossSubtotal, color: '#e8e8f0', bold: false, indent: false },
                      { label: '(-) Diskon', value: profitLoss.totalDiscount, color: '#ff4757', bold: false, indent: true, minus: true },
                      { label: 'Pendapatan Setelah Diskon', value: profitLoss.revenueAfterDiscount, color: '#a78bfa', bold: true, indent: false },
                      { label: '(-) Pajak 11%', value: profitLoss.totalTax, color: '#f5a623', bold: false, indent: true, minus: true },
                      { label: 'Laba Bersih', value: profitLoss.netProfit, color: profitLoss.netProfit >= 0 ? '#43e97b' : '#ff4757', bold: true, indent: false },
                    ].map((row, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px 0',
                        paddingLeft: row.indent ? 20 : 0,
                        borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        borderTop: (i === 2 || i === 4) ? '2px solid rgba(255,255,255,0.1)' : 'none',
                      }}>
                        <span style={{ fontSize: 13, color: row.bold ? '#e8e8f0' : 'var(--text-muted)', fontWeight: row.bold ? 700 : 400 }}>
                          {row.label}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: row.bold ? 800 : 500, color: row.color }}>
                          {(row as any).minus ? `- ${formatRupiah(row.value)}` : formatRupiah(row.value)}
                        </span>
                      </div>
                    ))}

                    {/* Margin */}
                    <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div style={{ background: 'rgba(108,99,255,0.08)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(108,99,255,0.15)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Margin Kotor</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: '#6c63ff' }}>{profitLoss.grossProfitMargin.toFixed(1)}%</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>setelah diskon</div>
                      </div>
                      <div style={{ background: 'rgba(67,233,123,0.08)', borderRadius: 10, padding: '10px 14px', border: '1px solid rgba(67,233,123,0.15)' }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Margin Bersih</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: profitLoss.netProfitMargin >= 0 ? '#43e97b' : '#ff4757' }}>
                          {profitLoss.netProfitMargin.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>setelah pajak</div>
                      </div>
                    </div>

                    {/* Status box */}
                    <div style={{
                      marginTop: 16, padding: 20, borderRadius: 12, textAlign: 'center',
                      background: profitLoss.netProfit >= 0 ? 'rgba(67,233,123,0.08)' : 'rgba(255,71,87,0.08)',
                      border: `1px solid ${profitLoss.netProfit >= 0 ? 'rgba(67,233,123,0.2)' : 'rgba(255,71,87,0.2)'}`,
                    }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>
                        {profitLoss.netProfit >= 0 ? '✅ Bisnis Menguntungkan' : '⚠️ Bisnis Merugi'}
                      </div>
                      <div style={{ fontSize: 30, fontWeight: 800, color: profitLoss.netProfit >= 0 ? '#43e97b' : '#ff4757', fontFamily: 'Syne' }}>
                        {formatRupiah(profitLoss.netProfit)}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        Laba Bersih · {profitLoss.label}
                      </div>
                    </div>
                  </div>

                  {/* Pie chart */}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 12 }}>
                      Metode Pembayaran
                    </div>
                    {paymentChartData.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie data={paymentChartData} dataKey="value" nameKey="name"
                              cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                              {paymentChartData.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{ background: '#111118', border: '1px solid #2a2a3e', borderRadius: 10, fontSize: 12, color: '#e8e8f0' }}
                              itemStyle={{ color: '#e8e8f0' }}
                              labelStyle={{ color: '#e8e8f0' }}
                              formatter={(v) => [formatRupiah(Number(v)), 'Total']}
                            />
                            <Legend
                              iconType="circle" iconSize={8}
                              formatter={(value) => <span style={{ color: '#e8e8f0', fontSize: 12 }}>{value}</span>}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ marginTop: 8 }}>
                          {Object.entries(profitLoss.paymentBreakdown).map(([method, data], i) => (
                            <div key={method} style={{
                              display: 'flex', justifyContent: 'space-between',
                              padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)'
                            }}>
                              <span style={{ fontSize: 13, color: '#e8e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], display: 'inline-block', flexShrink: 0 }} />
                                {paymentLabels[method] || method}
                              </span>
                              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                {data.count}x · {formatRupiah(data.total)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                        Belum ada data
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timeline Chart */}
              {timelineData.length > 0 && (
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                  <SectionTitle>
                    📊 Tren Revenue {plPeriod === 'daily' ? 'per Jam' : 'per Hari'}
                  </SectionTitle>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={timelineData} barCategoryGap="40%" barSize={24}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false} interval={0} />
                      <YAxis tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false}
                        tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip {...tooltipStyle} formatter={(v) => [formatRupiah(Number(v)), 'Revenue']} />
                      <Bar dataKey="revenue" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* KPI */}
              <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <SectionTitle>🎯 KPI Utama</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                  <MetricCard label="Total Transaksi" value={String(profitLoss.totalTransactions)} sub="transaksi selesai" color="var(--accent)" />
                  <MetricCard label="Rata-rata/Transaksi" value={formatRupiah(profitLoss.avgTransactionValue)} sub="nilai per transaksi" color="#4facfe" />
                  <MetricCard label="Margin Kotor" value={`${profitLoss.grossProfitMargin.toFixed(1)}%`} sub="setelah diskon" color="#43e97b" />
                  <MetricCard label="Margin Bersih" value={`${profitLoss.netProfitMargin.toFixed(1)}%`} sub="setelah pajak"
                    color={profitLoss.netProfitMargin >= 0 ? '#43e97b' : '#ff4757'} />
                </div>
              </div>

              {/* Top produk */}
              <div className="glass" style={{ padding: 24 }}>
                <SectionTitle>🏆 Top 5 Produk Revenue Tertinggi</SectionTitle>
                <table>
                  <thead>
                    <tr><th>#</th><th>Produk</th><th>Qty</th><th>Revenue</th><th>% dari Total</th></tr>
                  </thead>
                  <tbody>
                    {profitLoss.topProducts.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Tidak ada data</td></tr>
                    )}
                    {profitLoss.topProducts.map((p, i) => (
                      <tr key={p.id}>
                        <td>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
                        <td style={{ fontWeight: 500 }}>{p.name}</td>
                        <td><span className="badge badge-blue">{p.qty} unit</span></td>
                        <td style={{ fontWeight: 600 }}>{formatRupiah(p.revenue)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', width: 80, overflow: 'hidden' }}>
                              <div style={{
                                height: '100%', borderRadius: 3, background: COLORS[i % COLORS.length],
                                width: `${Math.min((p.revenue / (profitLoss.grossRevenue || 1) * 100), 100).toFixed(0)}%`
                              }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {(p.revenue / (profitLoss.grossRevenue || 1) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB: PERFORMA KASIR */}
      {activeTab === 'cashier' && (
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>Performa Kasir</h2>
              {cashierPerf && (
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                  {cashierPerf.cashiers.length} kasir aktif · {profitLoss?.label || plMonth}
                </p>
              )}
            </div>
            <PLFilter compact />
          </div>

          {!cashierPerf || cashierPerf.cashiers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              Tidak ada data kasir pada periode ini
            </div>
          ) : (
            <>
              {/* Top 3 cards */}
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(cashierPerf.cashiers.length, 3)}, 1fr)`, gap: 12, marginBottom: 24 }}>
                {cashierPerf.cashiers.slice(0, 3).map((c, i) => (
                  <div key={c.id} style={{
                    background: 'var(--bg)', borderRadius: 14, padding: 20,
                    border: `1px solid ${COLORS[i]}40`, position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{
                      position: 'absolute', top: -20, right: -20, width: 80, height: 80,
                      borderRadius: '50%', background: COLORS[i], opacity: 0.08
                    }} />
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{['🥇', '🥈', '🥉'][i]}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{c.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: COLORS[i], fontFamily: 'Syne' }}>
                      {formatRupiah(c.revenue)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                      {c.transactions} transaksi · {c.items} item
                    </div>
                  </div>
                ))}
              </div>

              <SectionTitle>📋 Detail Performa</SectionTitle>
              <table>
                <thead>
                  <tr><th>#</th><th>Kasir</th><th>Transaksi</th><th>Item</th><th>Avg/Transaksi</th><th>Total Revenue</th><th>Share</th></tr>
                </thead>
                <tbody>
                  {cashierPerf.cashiers.map((c, i) => {
                    const totalRev = cashierPerf.cashiers.reduce((s, x) => s + x.revenue, 0)
                    const share = totalRev > 0 ? (c.revenue / totalRev * 100) : 0
                    return (
                      <tr key={c.id}>
                        <td>{i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</td>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td><span className="badge badge-blue">{c.transactions}x</span></td>
                        <td>{c.items} unit</td>
                        <td style={{ color: 'var(--text-muted)' }}>{formatRupiah(c.avgTransaction)}</td>
                        <td style={{ fontWeight: 700 }}>{formatRupiah(c.revenue)}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', width: 60, overflow: 'hidden' }}>
                              <div style={{ height: '100%', borderRadius: 3, background: COLORS[i % COLORS.length], width: `${share.toFixed(0)}%` }} />
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{share.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Bar chart kasir */}
              <div style={{ marginTop: 24 }}>
                <SectionTitle>📊 Visualisasi Revenue per Kasir</SectionTitle>
                <ResponsiveContainer width="100%" height={Math.max(160, cashierPerf.cashiers.length * 52)}>
                  <BarChart data={cashierPerf.cashiers} layout="vertical" barSize={24}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: '#6b6b80', fontSize: 11 }} axisLine={false} tickLine={false}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#e8e8f0', fontSize: 12 }}
                      axisLine={false} tickLine={false} width={90} />
                    <Tooltip
                      contentStyle={{ background: '#111118', border: '1px solid #2a2a3e', borderRadius: 10, fontSize: 12, color: '#e8e8f0' }}
                      itemStyle={{ color: '#e8e8f0' }}
                      labelStyle={{ color: '#e8e8f0', fontWeight: 600 }}
                      cursor={{ fill: 'rgba(108,99,255,0.08)' }}
                      formatter={(v) => [formatRupiah(Number(v)), 'Revenue']}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                      {cashierPerf.cashiers.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}