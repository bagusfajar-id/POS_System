import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Share } from 'react-native'
import * as Print from 'expo-print'
import { formatRupiah, formatDate } from '../lib/utils'

export default function ReceiptScreen({ route, navigation }: { route: any; navigation: any }) {
  const { transaction: t } = route.params

  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: monospace; font-size: 12px; margin: 0; padding: 16px; max-width: 300px; }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .row { display: flex; justify-content: space-between; margin: 3px 0; }
        .total-row { font-size: 14px; font-weight: bold; }
        .logo { font-size: 20px; margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <div class="center">
        <div class="logo">◈</div>
        <div class="bold" style="font-size:16px">POS SYSTEM</div>
        <div>Struk Pembayaran</div>
        ${t.offline ? '<div style="color:red">** OFFLINE TRANSACTION **</div>' : ''}
      </div>
      <div class="divider"></div>
      <div class="row"><span>Invoice</span><span>${t.invoiceNo}</span></div>
      <div class="row"><span>Kasir</span><span>${t.user?.name || '-'}</span></div>
      <div class="row"><span>Cabang</span><span>${t.branch?.name || '-'}</span></div>
      <div class="row"><span>Waktu</span><span>${t.createdAt ? formatDate(t.createdAt) : new Date().toLocaleString('id-ID')}</span></div>
      <div class="divider"></div>
      ${t.items?.map((item: any) => `
        <div class="row">
          <span>${item.product?.name}</span>
          <span>${item.quantity}x${formatRupiah(item.price)}</span>
        </div>
        <div class="row"><span></span><span>${formatRupiah(item.subtotal)}</span></div>
      `).join('') || ''}
      <div class="divider"></div>
      <div class="row"><span>Subtotal</span><span>${formatRupiah(t.subtotal)}</span></div>
      ${t.discount > 0 ? `<div class="row"><span>Diskon</span><span>-${formatRupiah(t.discount)}</span></div>` : ''}
      <div class="row"><span>Pajak (11%)</span><span>${formatRupiah(t.tax)}</span></div>
      <div class="divider"></div>
      <div class="row total-row"><span>TOTAL</span><span>${formatRupiah(t.total)}</span></div>
      <div class="row"><span>Bayar</span><span>${formatRupiah(t.amountPaid)}</span></div>
      <div class="row"><span>Kembali</span><span>${formatRupiah(t.change)}</span></div>
      <div class="divider"></div>
      <div class="center" style="margin-top:8px">Terima kasih atas kunjungan Anda!</div>
    </body>
    </html>
  `

  const handlePrint = async () => {
    try {
      await Print.printAsync({ html: receiptHTML })
    } catch {
      Alert.alert('Error', 'Gagal mencetak struk')
    }
  }

  const handleShare = async () => {
    try {
      const text = `STRUK PEMBAYARAN\n${t.invoiceNo}\nTotal: ${formatRupiah(t.total)}\nBayar: ${formatRupiah(t.amountPaid)}\nKembali: ${formatRupiah(t.change)}`
      await Share.share({ message: text })
    } catch {
      Alert.alert('Error', 'Gagal membagikan struk')
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>✅ Transaksi Berhasil</Text>
        {t.offline && <Text style={styles.offlineBadge}>OFFLINE - Akan disync otomatis</Text>}
      </View>

      <ScrollView style={styles.scroll}>
        {/* Receipt Preview */}
        <View style={styles.receipt}>
          <Text style={styles.receiptLogo}>◈</Text>
          <Text style={styles.receiptShop}>POS SYSTEM</Text>
          <Text style={styles.receiptSub}>Struk Pembayaran</Text>

          <View style={styles.divider} />

          {[
            ['Invoice', t.invoiceNo],
            ['Kasir', t.user?.name || '-'],
            ['Cabang', t.branch?.name || '-'],
          ].map(([k, v]) => (
            <View key={k} style={styles.row}>
              <Text style={styles.rowKey}>{k}</Text>
              <Text style={styles.rowVal}>{v}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          {t.items?.map((item: any, i: number) => (
            <View key={i}>
              <Text style={styles.itemName}>{item.product?.name}</Text>
              <View style={styles.row}>
                <Text style={styles.rowKey}>{item.quantity}x {formatRupiah(item.price)}</Text>
                <Text style={styles.rowVal}>{formatRupiah(item.subtotal)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.divider} />

          {[
            ['Subtotal', formatRupiah(t.subtotal)],
            ['Pajak (11%)', formatRupiah(t.tax)],
          ].map(([k, v]) => (
            <View key={k} style={styles.row}>
              <Text style={styles.rowKey}>{k}</Text>
              <Text style={styles.rowVal}>{v}</Text>
            </View>
          ))}
          {t.discount > 0 && (
            <View style={styles.row}>
              <Text style={styles.rowKey}>Diskon</Text>
              <Text style={[styles.rowVal, { color: '#ff4757' }]}>-{formatRupiah(t.discount)}</Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.totalKey}>TOTAL</Text>
            <Text style={styles.totalVal}>{formatRupiah(t.total)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowKey}>Bayar</Text>
            <Text style={styles.rowVal}>{formatRupiah(t.amountPaid)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowKey}>Kembali</Text>
            <Text style={[styles.rowVal, { color: '#43e97b' }]}>{formatRupiah(t.change)}</Text>
          </View>

          <View style={styles.divider} />
          <Text style={styles.thanks}>Terima kasih atas kunjungan Anda!</Text>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.printBtn} onPress={handlePrint}>
            <Text style={styles.printText}>🖨 Cetak</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareText}>📤 Bagikan</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.navigate('POS')}
        >
          <Text style={styles.doneBtnText}>✓ Transaksi Baru</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: {
    padding: 16, paddingTop: 50, backgroundColor: '#111118',
    borderBottomWidth: 1, borderBottomColor: '#1e1e2e', alignItems: 'center'
  },
  title: { fontSize: 18, fontWeight: '800', color: '#43e97b' },
  offlineBadge: { fontSize: 11, color: '#ffc107', marginTop: 4 },
  scroll: { flex: 1 },
  receipt: {
    backgroundColor: 'white', margin: 16, borderRadius: 12,
    padding: 20, alignItems: 'center'
  },
  receiptLogo: { fontSize: 28, marginBottom: 4 },
  receiptShop: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 2 },
  receiptSub: { fontSize: 12, color: '#666', marginBottom: 8 },
  divider: { borderTopWidth: 1, borderTopColor: '#ddd', borderStyle: 'dashed', width: '100%', marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginVertical: 2 },
  rowKey: { fontSize: 12, color: '#666' },
  rowVal: { fontSize: 12, color: '#111', fontWeight: '500' },
  itemName: { fontSize: 12, color: '#111', fontWeight: '600', width: '100%', marginTop: 4 },
  totalKey: { fontSize: 15, fontWeight: '800', color: '#111' },
  totalVal: { fontSize: 15, fontWeight: '800', color: '#6c63ff' },
  thanks: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 8 },
  footer: { padding: 16, backgroundColor: '#111118', borderTopWidth: 1, borderTopColor: '#1e1e2e', gap: 10 },
  footerRow: { flexDirection: 'row', gap: 10 },
  printBtn: {
    flex: 1, backgroundColor: '#1e1e2e', borderRadius: 10,
    padding: 12, alignItems: 'center'
  },
  printText: { color: '#e8e8f0', fontWeight: '600' },
  shareBtn: {
    flex: 1, backgroundColor: '#1e1e2e', borderRadius: 10,
    padding: 12, alignItems: 'center'
  },
  shareText: { color: '#e8e8f0', fontWeight: '600' },
  doneBtn: { backgroundColor: '#6c63ff', borderRadius: 12, padding: 14, alignItems: 'center' },
  doneBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },
})