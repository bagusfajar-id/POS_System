import { useState, useEffect, useCallback } from 'react'
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, Modal
} from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import ProductCard from '../components/ProductCard'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { cacheProducts, getCachedProducts } from '../lib/db'
import type { CachedProduct } from '../lib/db'
import * as Network from 'expo-network'

export default function POSScreen({ navigation }: { navigation: any }) {
  const [products, setProducts] = useState<CachedProduct[]>([])
  const [filtered, setFiltered] = useState<CachedProduct[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [isOffline, setIsOffline] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [permission, requestPermission] = useCameraPermissions()
  const { addItem, items } = useCartStore()
  const { user } = useAuthStore()

  const loadProducts = useCallback(async () => {
    try {
      const network = await Network.getNetworkStateAsync()
      if (!network.isConnected) {
        setIsOffline(true)
        const cached = getCachedProducts()
        setProducts(cached)
        setFiltered(cached)
        return
      }
      setIsOffline(false)
      const { data } = await api.get('/products')
      const mapped: CachedProduct[] = data.map((p: {
        id: string; name: string; barcode?: string;
        price: number; stock: number;
        category?: { name: string }; branchId?: string
      }) => ({
        id: p.id, name: p.name, barcode: p.barcode || '',
        price: p.price, stock: p.stock,
        categoryName: p.category?.name || '',
        branchId: p.branchId || ''
      }))
      cacheProducts(mapped)
      setProducts(mapped)
      setFiltered(mapped)
    } catch {
      const cached = getCachedProducts()
      setProducts(cached)
      setFiltered(cached)
      setIsOffline(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadProducts() }, [loadProducts])

  useEffect(() => {
    if (search.trim() === '') {
      setFiltered(products)
    } else {
      setFiltered(products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.includes(search)
      ))
    }
  }, [search, products])

  const handleBarcodeScan = ({ data }: { data: string }) => {
    setScanning(false)
    const product = products.find(p => p.barcode === data)
    if (product) {
      addItem({ ...product, quantity: 1 })
      Alert.alert('✅ Ditambahkan', `${product.name} ditambahkan ke keranjang`)
    } else {
      Alert.alert('Produk tidak ditemukan', `Barcode: ${data}`)
    }
  }

  const handleScan = async () => {
    if (!permission?.granted) {
      const res = await requestPermission()
      if (!res.granted) {
        Alert.alert('Izin kamera diperlukan', 'Aktifkan izin kamera di pengaturan')
        return
      }
    }
    setScanning(true)
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Kasir POS</Text>
          <Text style={styles.headerSub}>
            {user?.name} · {user?.branch?.name}
            {isOffline ? ' · OFFLINE' : ''}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.scanBtn} onPress={handleScan}>
            <Text style={styles.scanIcon}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => navigation.navigate('Cart')}
          >
            <Text style={styles.cartIcon}>🛒</Text>
            {items.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{items.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Cari produk atau barcode..."
          placeholderTextColor="#6b6b80"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Products */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6c63ff" />
          <Text style={styles.loadingText}>Memuat produk...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <ProductCard
              {...item}
              onPress={() => {
                addItem({ ...item, quantity: 1 })
                Alert.alert('✅', `${item.name} ditambahkan`)
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>Produk tidak ditemukan</Text>
            </View>
          }
        />
      )}

      {/* Cart Footer */}
      {items.length > 0 && (
        <TouchableOpacity
          style={styles.cartFooter}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.cartFooterText}>
            🛒 {items.length} item · Lihat Keranjang →
          </Text>
        </TouchableOpacity>
      )}

      {/* Barcode Scanner Modal */}
      <Modal visible={scanning} animationType="slide">
        <View style={styles.scannerContainer}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            onBarcodeScanned={handleBarcodeScan}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'qr', 'code128', 'code39']
            }}
          />
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerTitle}>📷 Scan Barcode</Text>
            <View style={styles.scannerFrame} />
            <Text style={styles.scannerHint}>Arahkan kamera ke barcode produk</Text>
            <TouchableOpacity
              style={styles.cancelScan}
              onPress={() => setScanning(false)}
            >
              <Text style={styles.cancelScanText}>✕ Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#e8e8f0' },
  headerSub: { fontSize: 12, color: '#6b6b80', marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 12 },
  scanBtn: {
    width: 40, height: 40, backgroundColor: '#1e1e2e',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center'
  },
  scanIcon: { fontSize: 18 },
  cartBtn: {
    position: 'relative', width: 40, height: 40,
    backgroundColor: '#6c63ff', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center'
  },
  cartIcon: { fontSize: 18 },
  badge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#ff4757', borderRadius: 10,
    width: 18, height: 18, alignItems: 'center', justifyContent: 'center'
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  searchBox: { padding: 12 },
  searchInput: {
    backgroundColor: '#111118', borderWidth: 1, borderColor: '#1e1e2e',
    borderRadius: 10, padding: 10, color: '#e8e8f0', fontSize: 14
  },
  grid: { padding: 8 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { color: '#6b6b80', marginTop: 12 },
  emptyText: { color: '#6b6b80', fontSize: 14 },
  cartFooter: {
    backgroundColor: '#6c63ff', padding: 16, margin: 12, borderRadius: 12, alignItems: 'center'
  },
  cartFooterText: { color: 'white', fontSize: 15, fontWeight: '600' },
  scannerContainer: { flex: 1, backgroundColor: 'black' },
  scannerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center'
  },
  scannerTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 40 },
  scannerFrame: {
    width: 250, height: 250,
    borderWidth: 2, borderColor: '#6c63ff',
    borderRadius: 12, marginBottom: 24
  },
  scannerHint: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 32 },
  cancelScan: {
    backgroundColor: 'rgba(0,0,0,0.6)', padding: 14,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'
  },
  cancelScanText: { color: 'white', fontSize: 15 },
})