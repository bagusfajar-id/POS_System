import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native'
import CartItem from '../components/CartItem'
import { useCartStore } from '../store/cartStore'
import { formatRupiah } from '../lib/utils'

const PAYMENT_METHODS = [
  { id: 'CASH', label: '💵 Tunai' },
  { id: 'QRIS', label: '📱 QRIS' },
  { id: 'TRANSFER', label: '🏦 Transfer' },
  { id: 'CARD', label: '💳 Kartu' },
]

export default function CartScreen({ navigation }: { navigation: any }) {
  const {
    items, discount, paymentMethod,
    setDiscount, setPaymentMethod, clearCart,
    subtotal, tax, total
  } = useCartStore()

  const sub = subtotal()
  const t = tax()
  const tot = total()

  if (items.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyText}>Keranjang kosong</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Kembali ke Produk</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Kembali</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Keranjang</Text>
        <TouchableOpacity onPress={() => {
          Alert.alert('Kosongkan Keranjang', 'Yakin ingin mengosongkan keranjang?', [
            { text: 'Batal', style: 'cancel' },
            { text: 'Ya', style: 'destructive', onPress: clearCart }
          ])
        }}>
          <Text style={styles.clear}>Kosongkan</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Item ({items.length})</Text>
          {items.map(item => (
            <CartItem key={item.id} {...item} />
          ))}
        </View>

        {/* Diskon */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Diskon</Text>
          <TextInput
            style={styles.discountInput}
            value={discount > 0 ? String(discount) : ''}
            onChangeText={v => setDiscount(Number(v) || 0)}
            placeholder="0"
            placeholderTextColor="#6b6b80"
            keyboardType="numeric"
          />
        </View>

        {/* Metode Pembayaran */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Metode Pembayaran</Text>
          <View style={styles.paymentGrid}>
            {PAYMENT_METHODS.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.payBtn, paymentMethod === m.id && styles.payBtnActive]}
                onPress={() => setPaymentMethod(m.id)}
              >
                <Text style={[styles.payBtnText, paymentMethod === m.id && styles.payBtnTextActive]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* QRIS Display */}
        {paymentMethod === 'QRIS' && (
          <View style={[styles.card, styles.qrisCard]}>
            <Text style={styles.qrisTitle}>📱 QRIS Payment</Text>
            <View style={styles.qrisBox}>
              <Text style={styles.qrisPlaceholder}>[ QR Code ]</Text>
              <Text style={styles.qrisAmount}>{formatRupiah(tot)}</Text>
            </View>
            <Text style={styles.qrisHint}>Scan QR di atas menggunakan aplikasi pembayaran</Text>
          </View>
        )}

        {/* Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ringkasan</Text>
          {[
            ['Subtotal', formatRupiah(sub)],
            ['Diskon', `- ${formatRupiah(discount)}`],
            ['Pajak (11%)', formatRupiah(t)],
          ].map(([k, v]) => (
            <View key={k} style={styles.summaryRow}>
              <Text style={styles.summaryKey}>{k}</Text>
              <Text style={styles.summaryVal}>{v}</Text>
            </View>
          ))}
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalKey}>TOTAL</Text>
            <Text style={styles.totalVal}>{formatRupiah(tot)}</Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bayar Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.payNowBtn}
          onPress={() => navigation.navigate('Payment')}
        >
          <Text style={styles.payNowText}>
            Bayar {formatRupiah(tot)} →
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  empty: { flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#6b6b80', marginBottom: 24 },
  backBtn: { backgroundColor: '#6c63ff', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  backBtnText: { color: 'white', fontWeight: '600' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingTop: 50, backgroundColor: '#111118',
    borderBottomWidth: 1, borderBottomColor: '#1e1e2e'
  },
  back: { color: '#6c63ff', fontSize: 14 },
  title: { fontSize: 16, fontWeight: '700', color: '#e8e8f0' },
  clear: { color: '#ff4757', fontSize: 13 },
  scroll: { flex: 1 },
  card: {
    backgroundColor: '#111118', margin: 12, borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: '#1e1e2e'
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b6b80', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  discountInput: {
    backgroundColor: '#0a0a0f', borderWidth: 1, borderColor: '#1e1e2e',
    borderRadius: 8, padding: 10, color: '#e8e8f0', fontSize: 14
  },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: '#1e1e2e',
    backgroundColor: '#0a0a0f'
  },
  payBtnActive: { backgroundColor: '#6c63ff', borderColor: '#6c63ff' },
  payBtnText: { color: '#6b6b80', fontSize: 13 },
  payBtnTextActive: { color: 'white', fontWeight: '600' },
  qrisCard: { alignItems: 'center' },
  qrisTitle: { fontSize: 15, fontWeight: '700', color: '#e8e8f0', marginBottom: 16 },
  qrisBox: {
    width: 200, height: 200, backgroundColor: 'white',
    borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12
  },
  qrisPlaceholder: { fontSize: 16, color: '#333', fontWeight: '600' },
  qrisAmount: { fontSize: 14, color: '#6c63ff', marginTop: 8, fontWeight: '700' },
  qrisHint: { fontSize: 12, color: '#6b6b80', textAlign: 'center' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryKey: { fontSize: 13, color: '#6b6b80' },
  summaryVal: { fontSize: 13, color: '#e8e8f0' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#1e1e2e', paddingTop: 12, marginTop: 4 },
  totalKey: { fontSize: 16, fontWeight: '700', color: '#e8e8f0' },
  totalVal: { fontSize: 18, fontWeight: '800', color: '#43e97b' },
  footer: { padding: 16, backgroundColor: '#111118', borderTopWidth: 1, borderTopColor: '#1e1e2e' },
  payNowBtn: { backgroundColor: '#6c63ff', borderRadius: 12, padding: 16, alignItems: 'center' },
  payNowText: { color: 'white', fontSize: 16, fontWeight: '700' },
})