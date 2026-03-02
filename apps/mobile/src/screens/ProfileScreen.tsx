import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useAuthStore } from '../store/authStore'
import { getUnsyncedTransactions } from '../lib/db'
import api from '../lib/api'
import * as Network from 'expo-network'

export default function ProfileScreen() {
  const { user, logout } = useAuthStore()
  const unsynced = getUnsyncedTransactions()

  const handleSync = async () => {
    const network = await Network.getNetworkStateAsync()
    if (!network.isConnected) {
      Alert.alert('Offline', 'Tidak ada koneksi internet')
      return
    }
    if (unsynced.length === 0) {
      Alert.alert('✅', 'Semua transaksi sudah tersync')
      return
    }
    // Sync logic sudah ada di saveOfflineTransaction
    Alert.alert('Sync', `${unsynced.length} transaksi offline akan disync`)
  }

  const handleLogout = () => {
    Alert.alert('Logout', 'Yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout }
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userRole}>{user?.role}</Text>
          {user?.branch && <Text style={styles.userBranch}>🏪 {user.branch.name}</Text>}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{unsynced.length}</Text>
          <Text style={styles.statLabel}>Transaksi Offline</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {unsynced.length > 0 && (
          <TouchableOpacity style={styles.syncBtn} onPress={handleSync}>
            <Text style={styles.syncText}>🔄 Sync Transaksi Offline ({unsynced.length})</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>⎋ Logout</Text>
        </TouchableOpacity>
      </View>
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
  userCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    margin: 16, backgroundColor: '#111118',
    borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#1e1e2e'
  },
  avatar: {
    width: 56, height: 56, backgroundColor: '#6c63ff',
    borderRadius: 28, alignItems: 'center', justifyContent: 'center'
  },
  avatarText: { fontSize: 22, fontWeight: '800', color: 'white' },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '700', color: '#e8e8f0' },
  userRole: { fontSize: 13, color: '#6b6b80', marginTop: 2 },
  userBranch: { fontSize: 13, color: '#6c63ff', marginTop: 4 },
  statsCard: {
    margin: 16, backgroundColor: '#111118',
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#1e1e2e'
  },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800', color: '#ffc107' },
  statLabel: { fontSize: 12, color: '#6b6b80', marginTop: 4 },
  actions: { margin: 16, gap: 12 },
  syncBtn: {
    backgroundColor: 'rgba(255,193,7,0.1)', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,193,7,0.3)'
  },
  syncText: { color: '#ffc107', fontWeight: '600', fontSize: 14 },
  logoutBtn: {
    backgroundColor: 'rgba(255,71,87,0.1)', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,71,87,0.3)'
  },
  logoutText: { color: '#ff4757', fontWeight: '600', fontSize: 14 },
})