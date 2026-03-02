import { useEffect, useState, useCallback } from 'react'
import api from '../lib/api'
import { formatRupiah, formatDate } from '../lib/utils'
import { useAuthStore } from '../store/authStore'
import { canCancelTransaction } from '../lib/roles'
import type { Role } from '../lib/roles'

interface TransactionItem {
  id: string
  price: number
  quantity: number
  subtotal: number
  product?: { name: string }
}

interface Transaction {
  id: string
  invoiceNo: string
  total: number
  subtotal: number
  discount: number
  tax: number
  amountPaid: number
  change: number
  paymentMethod: string
  status: string
  createdAt: string
  user?: { name: string }
  branch?: { name: string }
  items?: TransactionItem[]
}

interface Pagination {
  page: number
  total: number
  totalPages: number
  limit: number
}

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, total: 0, totalPages: 0, limit: 15 })
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Transaction | null>(null)

  const { user } = useAuthStore()
  const role = (user?.role || 'CASHIER') as Role
  const canCancel = canCancelTransaction(role)

  const load = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get<{ data: Transaction[]; pagination: Pagination }>(
        '/transactions', { params: { page, limit: 15 } }
      )
      setTransactions(data.data)
      setPagination(data.pagination)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCancel = async (id: string) => {
    if (!confirm('Batalkan transaksi ini?')) return
    await api.patch(`/transactions/${id}/cancel`)
    load(pagination.page)
  }

  const statusBadge = (s: string) => {
    if (s === 'COMPLETED') return <span className="badge badge-green">Selesai</span>
    if (s === 'CANCELLED') return <span className="badge badge-red">Dibatalkan</span>
    return <span className="badge badge-yellow">{s}</span>
  }

  const paymentBadge = (p: string) => {
    const map: Record<string, string> = {
      CASH: '💵 Tunai', QRIS: '📱 QRIS', TRANSFER: '🏦 Transfer', CARD: '💳 Kartu'
    }
    return map[p] || p
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Transaksi</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
          Total {pagination.total} transaksi
        </p>
      </div>

      <div className="glass">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Kasir</th>
                <th>Cabang</th>
                <th>Total</th>
                <th>Pembayaran</th>
                <th>Status</th>
                <th>Waktu</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    Belum ada transaksi
                  </td>
                </tr>
              )}
              {transactions.map(t => (
                <tr key={t.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>
                    {t.invoiceNo}
                  </td>
                  <td style={{ fontSize: 13 }}>{t.user?.name}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.branch?.name}</td>
                  <td style={{ fontWeight: 600 }}>{formatRupiah(t.total)}</td>
                  <td style={{ fontSize: 13 }}>{paymentBadge(t.paymentMethod)}</td>
                  <td>{statusBadge(t.status)}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(t.createdAt)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn-ghost" style={{ padding: '5px 10px', fontSize: 11 }}
                        onClick={() => setDetail(t)}>Detail</button>
                      {canCancel && t.status === 'COMPLETED' && (
                        <button className="btn-danger" style={{ padding: '5px 10px', fontSize: 11 }}
                          onClick={() => handleCancel(t.id)}>Batal</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 20 }}>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => load(p)} style={{
                width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: p === pagination.page ? 'var(--accent)' : 'var(--bg-hover)',
                color: 'white', fontSize: 13, fontFamily: 'DM Sans'
              }}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {detail && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999
        }}>
          <div className="glass fade-in" style={{ width: 520, padding: 32, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Detail Transaksi</h2>
              <button className="btn-ghost" style={{ padding: '6px 12px' }} onClick={() => setDetail(null)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {([
                ['Invoice', detail.invoiceNo],
                ['Kasir', detail.user?.name ?? '-'],
                ['Cabang', detail.branch?.name ?? '-'],
                ['Pembayaran', detail.paymentMethod],
                ['Bayar', formatRupiah(detail.amountPaid)],
                ['Kembali', formatRupiah(detail.change)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Item</h3>
            <table>
              <thead>
                <tr>
                  <th>Produk</th><th>Qty</th><th>Harga</th><th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detail.items?.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontSize: 13 }}>{item.product?.name}</td>
                    <td style={{ fontSize: 13 }}>{item.quantity}</td>
                    <td style={{ fontSize: 13 }}>{formatRupiah(item.price)}</td>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>{formatRupiah(item.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 16 }}>
              {([
                ['Subtotal', formatRupiah(detail.subtotal)],
                ['Diskon', `- ${formatRupiah(detail.discount)}`],
                ['Pajak (11%)', formatRupiah(detail.tax)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, marginBottom: 8, color: 'var(--text-muted)'
                }}>
                  <span>{k}</span><span>{v}</span>
                </div>
              ))}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                fontSize: 16, fontWeight: 700, marginTop: 8
              }}>
                <span>Total</span>
                <span style={{ color: 'var(--accent-3)' }}>{formatRupiah(detail.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}