import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { formatRupiah, generateInvoiceNo } from '../lib/utils'
import { saveOfflineTransaction } from '../lib/db'
import api from '../lib/api'
import * as Network from 'expo-network'

export default function PaymentScreen({ navigation }: { navigation: any }) {
  const { items, discount, paymentMethod, total, subtotal, tax, clearCart } = useCartStore()
  const { user } = useAuthStore()
  const [amountPaid, setAmountPaid] = useState('')
  const [loading, setLoading] = useState(false)

  const tot = total()
  const sub = subtotal()
  const t = tax()
  const paid = Number(amountPaid) || 0
  const change = paid - tot

  const quickAmounts = [tot, Math.ceil(tot / 10000) * 10000, Math.ceil(tot / 50000) * 50000, Math.ceil(tot / 100000) * 100000]
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .slice(0, 4)

  const handleProcess = async () => {
    if (paymentMethod === 'CASH' && paid < tot) {
      Alert.alert('Kurang', 'Jumlah bayar kurang dari total')
      return
    }

    setLoading(true)
    try {
      const network = await Network.getNetworkStateAsync()
      const transactionData = {
        items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
        discount,
        paymentMethod,
        amountPaid: paymentMethod === 'CASH' ? paid : tot,
        branchId: user?.branch?.id
      }

      if (!network.isConnected) {
        // Simpan offline
        const invoiceNo = generateInvoiceNo(user?.branch?.name?.slice(0, 3) || 'POS')
        saveOfflineTransaction(invoiceNo, { ...transactionData, invoiceNo, offline: true })
        clearCart()
        navigation.navigate('Receipt', {
          transaction: {
            invoiceNo, total: tot, subtotal: sub, tax: t,
            discount, paymentMethod,
            amountPaid: transactionData.amountPaid,
            change: paymentMethod === 'CASH' ? change : 0,
            items: items.map(i => ({
              product: { name: i.name }, quantity: i.quantity,
              price: i.price, subtotal: i.price * i.quantity
            })),
            offline: true
          }
        })
        return
      }

      const { data } = await api.post('/transactions', transactionData)
      clearCart()
      navigation.navigate('Receipt', { transaction: data })
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Gagal memproses transaksi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pembayaran</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll}>
        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Pembayaran</Text>
          <Text style={styles.totalAmount}>{formatRupiah(tot)}</Text>
          <View style={styles.totalDetails}>
            <Text style={styles.detail}>Subtotal: {formatRupiah(sub)}</Text>
            <Text style={styles.detail}>Pajak: {formatRupiah(t)}</Text>
            {discount > 0 && <Text style={styles.detail}>Diskon: -{formatRupiah(discount)}</Text>}
          </View>
          <View style={styles.methodBadge}>
            <Text style={styles.methodText}>{paymentMethod}</Text>
          </View>
        </View>

        {/* Input bayar (hanya untuk CASH) */}
        {paymentMethod === 'CASH' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Jumlah Bayar</Text>
            <TextInput
              style={styles.input}
              value={amountPaid}
              onChangeText={setAmountPaid}
              placeholder="Masukkan jumlah..."
              placeholderTextColor="#6b6b80"
              keyboardType="numeric"
            />

            {/* Quick amounts */}
            <View style={styles.quickGrid}>
              {quickAmounts.map(v => (
                <TouchableOpacity
                  key={v}
                  style={styles.quickBtn}
                  onPress={() => setAmountPaid(String(v))}
                >
                  <Text style={styles.quickText}>{formatRupiah(v)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {paid >= tot && (
              <View style={styles.changeBox}>
                <Text style={styles.changeLabel}>Kembalian</Text>
                <Text style={styles.changeAmount}>{formatRupiah(change)}</Text>
              </View>
            )}
          </View>
        )}

        {paymentMethod !== 'CASH' && (
          <View style={styles.card}>
            <Text style={styles.nonCashText}>
              {paymentMethod === 'QRIS' ? '📱 Tunjukkan QR kepada pelanggan' : '💳 Proses pembayaran di terminal'}
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.processBtn,
            (paymentMethod === 'CASH' && paid < tot) && styles.processBtnDisabled
          ]}
          onPress={handleProcess}
          disabled={loading || (paymentMethod === 'CASH' && paid < tot)}
        >
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.processBtnText}>✓ Proses Transaksi</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 50, backgroundColor: '#111118',
    borderBottomWidth: 1, borderBottomColor: '#1e1e2e'
  },
  back: { color: '#6c63ff', fontSize: 14 },
  title: { fontSize: 16, fontWeight: '700', color: '#e8e8f0' },
  scroll: { flex: 1 },
  totalCard: {
    margin: 12, backgroundColor: '#6c63ff',
    borderRadius: 16, padding: 24, alignItems: 'center'
  },
  totalLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  totalAmount: { fontSize: 32, fontWeight: '800', color: 'white', marginBottom: 12 },
  totalDetails: { alignItems: 'center', gap: 2 },
  detail: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  methodBadge: {
    marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20
  },
  methodText: { color: 'white', fontSize: 13, fontWeight: '600' },
  card: {
    backgroundColor: '#111118', margin: 12, borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: '#1e1e2e'
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b6b80', marginBottom: 12 },
  input: {
    backgroundColor: '#0a0a0f', borderWidth: 1, borderColor: '#1e1e2e',
    borderRadius: 8, padding: 12, color: '#e8e8f0', fontSize: 18,
    fontWeight: '600', marginBottom: 12
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickBtn: {
    backgroundColor: '#0a0a0f', borderWidth: 1, borderColor: '#1e1e2e',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8
  },
  quickText: { color: '#6c63ff', fontSize: 12, fontWeight: '600' },
  changeBox: {
    marginTop: 12, backgroundColor: 'rgba(67,233,123,0.1)',
    borderRadius: 8, padding: 12, flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center'
  },
  changeLabel: { fontSize: 13, color: '#43e97b' },
  changeAmount: { fontSize: 18, fontWeight: '800', color: '#43e97b' },
  nonCashText: { fontSize: 14, color: '#e8e8f0', textAlign: 'center', padding: 16 },
  footer: { padding: 16, backgroundColor: '#111118', borderTopWidth: 1, borderTopColor: '#1e1e2e' },
  processBtn: { backgroundColor: '#43e97b', borderRadius: 12, padding: 16, alignItems: 'center' },
  processBtnDisabled: { backgroundColor: '#1e1e2e' },
  processBtnText: { color: '#0a0a0f', fontSize: 16, fontWeight: '800' },
})