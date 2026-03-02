import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { formatRupiah } from '../lib/utils'
import { useCartStore } from '../store/cartStore'

interface Props {
  id: string
  name: string
  price: number
  quantity: number
  stock: number
}

export default function CartItem({ id, name, price, quantity, stock }: Props) {
  const { updateQty, removeItem } = useCartStore()

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.price}>{formatRupiah(price)}</Text>
      </View>
      <View style={styles.qtyRow}>
        <TouchableOpacity style={styles.btn} onPress={() => updateQty(id, quantity - 1)}>
          <Text style={styles.btnText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qty}>{quantity}</Text>
        <TouchableOpacity
          style={[styles.btn, quantity >= stock && styles.btnDisabled]}
          onPress={() => updateQty(id, quantity + 1)}
          disabled={quantity >= stock}
        >
          <Text style={styles.btnText}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => removeItem(id)}>
          <Text style={styles.deleteText}>🗑</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtotal}>{formatRupiah(price * quantity)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e2e',
    gap: 8
  },
  info: { flex: 1 },
  name: { fontSize: 13, color: '#e8e8f0', fontWeight: '500' },
  price: { fontSize: 12, color: '#6b6b80', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  btn: {
    width: 28, height: 28,
    backgroundColor: '#1e1e2e',
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center'
  },
  btnDisabled: { opacity: 0.3 },
  btnText: { color: '#e8e8f0', fontSize: 16, fontWeight: '600' },
  qty: { color: '#e8e8f0', fontSize: 14, fontWeight: '600', minWidth: 24, textAlign: 'center' },
  deleteBtn: { padding: 4 },
  deleteText: { fontSize: 14 },
  subtotal: { fontSize: 13, fontWeight: '700', color: '#43e97b', minWidth: 80, textAlign: 'right' },
})