import { TouchableOpacity, Text, View, StyleSheet } from 'react-native'
import { formatRupiah } from '../lib/utils'

interface Props {
  id: string
  name: string
  price: number
  stock: number
  categoryName?: string
  onPress: () => void
}

export default function ProductCard({ name, price, stock, categoryName, onPress }: Props) {
  const outOfStock = stock <= 0

  return (
    <TouchableOpacity
      style={[styles.card, outOfStock && styles.disabled]}
      onPress={onPress}
      disabled={outOfStock}
      activeOpacity={0.7}
    >
      <View style={styles.iconBox}>
        <Text style={styles.icon}>📦</Text>
      </View>
      {categoryName && (
        <Text style={styles.category}>{categoryName}</Text>
      )}
      <Text style={styles.name} numberOfLines={2}>{name}</Text>
      <Text style={styles.price}>{formatRupiah(price)}</Text>
      <View style={[styles.stockBadge, stock <= 5 ? styles.stockLow : styles.stockOk]}>
        <Text style={styles.stockText}>
          {outOfStock ? 'Habis' : `Stok: ${stock}`}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#111118',
    borderRadius: 12,
    padding: 12,
    margin: 4,
    flex: 1,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    minWidth: 140,
    maxWidth: 180,
  },
  disabled: { opacity: 0.4 },
  iconBox: {
    width: 40, height: 40,
    backgroundColor: 'rgba(108,99,255,0.1)',
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8
  },
  icon: { fontSize: 20 },
  category: { fontSize: 10, color: '#6b6b80', marginBottom: 2 },
  name: { fontSize: 13, fontWeight: '600', color: '#e8e8f0', marginBottom: 4, lineHeight: 18 },
  price: { fontSize: 13, fontWeight: '700', color: '#6c63ff', marginBottom: 6 },
  stockBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  stockOk: { backgroundColor: 'rgba(67,233,123,0.1)' },
  stockLow: { backgroundColor: 'rgba(255,71,87,0.1)' },
  stockText: { fontSize: 10, color: '#43e97b' },
})