import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from 'react-native'
import { useAuthStore } from '../store/authStore'
import api from '../lib/api'
import { AxiosError } from 'axios'
import { initDB } from '../lib/db'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Email dan password wajib diisi')
      return
    }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      await setAuth(data.user, data.token, data.refreshToken)
      initDB()
    } catch (err) {
      const e = err as AxiosError<{ error: string }>
      Alert.alert('Login Gagal', e.response?.data?.error || 'Periksa koneksi dan kredensial')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <View style={styles.logoBox}>
          <Text style={styles.logoIcon}>◈</Text>
        </View>
        <Text style={styles.title}>POS System</Text>
        <Text style={styles.subtitle}>Kasir App</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="kasir@pos.com"
            placeholderTextColor="#6b6b80"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#6b6b80"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="white" />
              : <Text style={styles.btnText}>→ Masuk</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.hint}>
          <Text style={styles.hintTitle}>Demo:</Text>
          <Text style={styles.hintText}>kasir@pos.com / kasir123</Text>
          <Text style={styles.hintText}>admin@pos.com / admin123</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#0a0a0f',
    alignItems: 'center', justifyContent: 'center', padding: 24
  },
  card: {
    backgroundColor: '#111118', borderRadius: 20,
    padding: 32, width: '100%', maxWidth: 400,
    borderWidth: 1, borderColor: '#1e1e2e', alignItems: 'center'
  },
  logoBox: {
    width: 60, height: 60, backgroundColor: '#6c63ff',
    borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16
  },
  logoIcon: { fontSize: 28, color: 'white' },
  title: { fontSize: 24, fontWeight: '800', color: '#e8e8f0', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b6b80', marginBottom: 28 },
  form: { width: '100%' },
  label: { fontSize: 13, color: '#6b6b80', marginBottom: 6, fontWeight: '500' },
  input: {
    backgroundColor: '#0a0a0f', borderWidth: 1, borderColor: '#1e1e2e',
    borderRadius: 10, padding: 12, color: '#e8e8f0', fontSize: 14, marginBottom: 16
  },
  btn: {
    backgroundColor: '#6c63ff', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 8
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: 'white', fontSize: 15, fontWeight: '600' },
  hint: {
    marginTop: 24, backgroundColor: 'rgba(108,99,255,0.05)',
    borderRadius: 10, padding: 14, width: '100%',
    borderWidth: 1, borderColor: 'rgba(108,99,255,0.1)'
  },
  hintTitle: { fontSize: 11, color: '#6b6b80', marginBottom: 4 },
  hintText: { fontSize: 12, color: '#e8e8f0' },
})