import { useEffect, useState, useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Modal, ScrollView
} from 'react-native'
import api from '../lib/api'
import { formatRupiah, formatDate } from '../lib/utils'

interface TrxItem { id: string; product?: { name: string }; quantity: number; price: number; subtotal: number }
interface Trx {
  id: string; invoiceNo: string; total: number; subtotal: number
  discount: number; tax: number; amountPaid: number; change: number
  paymentMethod: string; status: string; createdAt: string
  user?: { name: string }; branch?: { name: string }; items?: TrxItem[]
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<Trx[]>([])
  const [loading, setLoading] = useState(true)
  const [detail, setDetail] = useState<Trx | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const load = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const { data } = await api.get('/transactions', { params: { page: p, limit: 20 } })
      setTransactions(data.data)
      setTotalPages(data.pagination.totalPages)
      setPage(p)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const statusColor = (s: string) => s === 'COMPLETED' ? '#43e97b' : s === 'CANCELLED' ? '#ff4757' : '#ffc107'
  const paymentIcon = (p: string) => ({ CASH: '💵', QRIS: '📱', TRANSFER: '🏦', CARD: '💳' }[p] || '💰')

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Riwayat Transaksi</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6c63ff" />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={t => t.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: t }) => (
            <TouchableOpacity style={styles.card} onPress={() => setDetail(t)}>
              <View style={styles.cardTop}>
                <Text style={styles.invoice}>{t.invoiceNo}</Text>
                <Text style={[styles.status, { color: statusColor(t.status) }]}>
                  {t.status === 'COMPLETED' ? '✓ Selesai' : '✕ Dibatalkan'}
                </Text>
              </View>
              <View style={styles.cardMid}>
                <Text style={styles.amount}>{formatRupiah(t.total)}</Text>
                <Text style={styles.payment}>{paymentIcon(t.paymentMethod)} {t.paymentMethod}</Text>
              </View>
              <View style={styles.cardBot}>
                <Text style={styles.meta}>{t.user?.name} · {t.branch?.name}</Text>
                <Text style={styles.meta}>{formatDate(t.createdAt)}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.empty}>Belum ada transaksi</Text>
            </View>
          }
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination}>
                <TouchableOpacity
                  style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                  onPress={() => load(page - 1)} disabled={page <= 1}
                >
                  <Text style={styles.pageBtnText}>← Prev</Text>
                </TouchableOpacity>
                <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
                <TouchableOpacity
                  style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                  onPress={() => load(page + 1)} disabled={page >= totalPages}
                >
                  <Text style={styles.pageBtnText}>Next →</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />
      )}

      {/* Detail Modal */}
      <Modal visible={!!detail} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detail Transaksi</Text>
              <TouchableOpacity onPress={() => setDetail(null)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {detail && (
              <ScrollView>
                {[
                  ['Invoice', detail.invoiceNo],
                  ['Kasir', detail.user?.name ?? '-'],
                  ['Cabang', detail.branch?.name ?? '-'],
                  ['Pembayaran', detail.paymentMethod],
                  ['Status', detail.status],
                ].map(([k, v]) => (
                  <View key={k} style={styles.detailRow}>
                    <Text style={styles.detailKey}>{k}</Text>
                    <Text style={styles.detailVal}>{v}</Text>
                  </View>
                ))}
                <View style={styles.divider} />
                <Text style={styles.itemsTitle}>Item</Text>
                {detail.items?.map((item, i) => (
                  <View key={i} style={styles.detailRow}>
                    <Text style={styles.detailKey}>{item.product?.name} x{item.quantity}</Text>
                    <Text style={styles.detailVal}>{formatRupiah(item.subtotal)}</Text>
                  </View>
                ))}
                <View style={styles.divider} />
                {[
                  ['Subtotal', formatRupiah(detail.subtotal)],
                  ['Pajak', formatRupiah(detail.tax)],
                  ['Total', formatRupiah(detail.total)],
                  ['Bayar', formatRupiah(detail.amountPaid)],
                  ['Kembali', formatRupiah(detail.change)],
                ].map(([k, v]) => (
                  <View key={k} style={styles.detailRow}>
                    <Text style={styles.detailKey}>{k}</Text>
                    <Text style={[styles.detailVal, k === 'Total' && { color: '#43e97b', fontWeight: '700' }]}>{v}</Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    padding: 16, paddingTop: 50, backgroundColor: '#111118',
    borderBottomWidth: 1, borderBottomColor: '#1e1e2e'
  },
  title: { fontSize: 18, fontWeight: '800', color: '#e8e8f0' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  empty: { color: '#6b6b80', fontSize: 14 },
  list: { padding: 12 },
  card: {
    backgroundColor: '#111118', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#1e1e2e'
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  invoice: { fontSize: 12, fontFamily: 'monospace', color: '#6c63ff', fontWeight: '600' },
  status: { fontSize: 12, fontWeight: '600' },
  cardMid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  amount: { fontSize: 16, fontWeight: '800', color: '#e8e8f0' },
  payment: { fontSize: 13, color: '#6b6b80' },
  cardBot: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 11, color: '#6b6b80' },
  pagination: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  pageBtn: { backgroundColor: '#1e1e2e', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  pageBtnDisabled: { opacity: 0.3 },
  pageBtnText: { color: '#e8e8f0', fontSize: 13 },
  pageInfo: { color: '#6b6b80', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#111118', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, maxHeight: '80%', borderWidth: 1, borderColor: '#1e1e2e'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#e8e8f0' },
  modalClose: { fontSize: 18, color: '#6b6b80' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  detailKey: { fontSize: 13, color: '#6b6b80' },
  detailVal: { fontSize: 13, color: '#e8e8f0', fontWeight: '500' },
  divider: { borderTopWidth: 1, borderTopColor: '#1e1e2e', marginVertical: 10 },
  itemsTitle: { fontSize: 13, fontWeight: '700', color: '#6b6b80', marginBottom: 8 },
})