import { useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from './src/store/authStore'
import LoginScreen from './src/screens/LoginScreen'
import POSScreen from './src/screens/POSScreen'
import CartScreen from './src/screens/CartScreen'
import PaymentScreen from './src/screens/PaymentScreen'
import ReceiptScreen from './src/screens/ReceiptScreen'
import TransactionsScreen from './src/screens/TransactionsScreen'
import ProfileScreen from './src/screens/ProfileScreen'

const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

function POSStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="POS" component={POSScreen} />
      <Stack.Screen name="Cart" component={CartScreen} />
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="Receipt" component={ReceiptScreen} />
    </Stack.Navigator>
  )
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111118',
          borderTopColor: '#1e1e2e',
          borderTopWidth: 1,
          paddingBottom: 8,
          height: 60,
        },
        tabBarActiveTintColor: '#6c63ff',
        tabBarInactiveTintColor: '#6b6b80',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Kasir"
        component={POSStack}
        options={{ tabBarLabel: 'Kasir', tabBarIcon: ({ color }) => <TabIcon emoji="🛒" color={color} /> }}
      />
      <Tab.Screen
        name="Transaksi"
        component={TransactionsScreen}
        options={{ tabBarLabel: 'Transaksi', tabBarIcon: ({ color }) => <TabIcon emoji="🧾" color={color} /> }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profil', tabBarIcon: ({ color }) => <TabIcon emoji="👤" color={color} /> }}
      />
    </Tab.Navigator>
  )
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return (
    <View style={{ opacity: color === '#6c63ff' ? 1 : 0.5 }}>
      <ActivityIndicator style={{ display: 'none' }} />
      {/* Use text as icon */}
      <View><ActivityIndicator style={{ display: 'none' }} /></View>
    </View>
  )
}

export default function App() {
  const { isAuthenticated, loadAuth } = useAuthStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAuth().finally(() => setLoading(false))
  }, [loadAuth])

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#6c63ff" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated() ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}