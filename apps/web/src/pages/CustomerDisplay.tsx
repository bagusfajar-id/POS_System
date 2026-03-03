import { useEffect, useState, useRef } from 'react'

const API_URL = 'http://192.168.137.1:3001'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  subtotal: number
  image?: string
}

interface CartData {
  type: string
  items: CartItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: string
  kasirName: string
  branchName: string
}

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
  }).format(amount)

const paymentIcons: Record<string, string> = {
  CASH: '💵', QRIS: '📱', TRANSFER: '🏦', CARD: '💳'
}
const paymentLabels: Record<string, string> = {
  CASH: 'Tunai', QRIS: 'QRIS', TRANSFER: 'Transfer', CARD: 'Kartu'
}

function ProductAvatar({ name, size = 52 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div style={{
      width: size, height: size, borderRadius: 12, flexShrink: 0,
      background: 'rgba(108,99,255,0.12)',
      border: '1px solid rgba(108,99,255,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 800, color: '#6c63ff',
    }}>
      {initials}
    </div>
  )
}

function ProductImage({ item, size = 52 }: { item: CartItem; size?: number }) {
  const [error, setError] = useState(false)
  if (!item.image || error) return <ProductAvatar name={item.name} size={size} />
  return (
    <img
      src={`${API_URL}${item.image}`}
      alt={item.name}
      onError={() => setError(true)}
      style={{
        width: size, height: size, borderRadius: 12,
        objectFit: 'cover', flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    />
  )
}

export default function CustomerDisplay() {
  const [cart, setCart] = useState<CartData | null>(null)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [paid, setPaid] = useState(false)
  const [time, setTime] = useState(new Date())
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const connect = () => {
      const wsUrl = window.location.hostname === 'localhost'
        ? 'ws://localhost:3001/ws/display'
        : `ws://${window.location.hostname}:3001/ws/display`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as CartData
          setLastUpdate(new Date())
          if (data.type === 'cart_clear' || (data.items && data.items.length === 0)) {
            setCart(null)
            setPaid(data.type === 'payment_success')
            if (data.type === 'payment_success') setTimeout(() => setPaid(false), 5000)
          } else {
            setCart(data)
            setPaid(false)
          }
        } catch (e) { console.error(e) }
      }
      ws.onclose = () => { setConnected(false); setTimeout(connect, 3000) }
      ws.onerror = () => ws.close()
    }
    connect()
    return () => wsRef.current?.close()
  }, [])

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#07070d',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: '#e8e8f0', overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
        @keyframes successPop { 0% { transform:scale(0.5); opacity:0; } 70% { transform:scale(1.1); } 100% { transform:scale(1); opacity:1; } }
        .item-row { animation: fadeSlideIn 0.3s ease forwards; }
      `}</style>

      {/* Header */}
      <div style={{
        background: '#0f0f1a', padding: '14px 28px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => window.history.back()}
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '6px 14px', color: '#6b6b80',
              cursor: 'pointer', fontSize: 13, marginRight: 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#e8e8f0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#6b6b80')}
          >← Back</button>
          <div style={{
            width: 38, height: 38,
            background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
            borderRadius: 10, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 18,
            boxShadow: '0 4px 12px rgba(108,99,255,0.3)',
          }}>◈</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16 }}>POS System</div>
            <div style={{ fontSize: 11, color: '#6b6b80', letterSpacing: 0.5 }}>CUSTOMER DISPLAY</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 20, fontWeight: 500, letterSpacing: 1 }}>
            {time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: connected ? 'rgba(67,233,123,0.08)' : 'rgba(255,71,87,0.08)',
            border: `1px solid ${connected ? 'rgba(67,233,123,0.2)' : 'rgba(255,71,87,0.2)'}`,
            borderRadius: 20, padding: '5px 12px',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              backgroundColor: connected ? '#43e97b' : '#ff4757',
              animation: connected ? 'none' : 'pulse 1.5s infinite',
            }} />
            <span style={{ color: connected ? '#43e97b' : '#ff4757', fontSize: 12, fontWeight: 600 }}>
              {connected ? 'Terhubung' : 'Menghubungkan...'}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Payment Success */}
        {paid ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 28,
            background: 'radial-gradient(ellipse at center, rgba(67,233,123,0.08) 0%, transparent 70%)',
          }}>
            <div style={{ fontSize: 100, animation: 'successPop 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>✅</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 52, fontWeight: 800, color: '#43e97b', letterSpacing: -1, marginBottom: 10, animation: 'fadeSlideIn 0.4s 0.2s ease both' }}>
                Pembayaran Berhasil!
              </div>
              <div style={{ fontSize: 18, color: '#6b6b80', animation: 'fadeSlideIn 0.4s 0.4s ease both' }}>
                Terima kasih atas kunjungan Anda 🙏
              </div>
            </div>
          </div>

        ) : cart && cart.items?.length > 0 ? (
          <>
            {/* Items Panel */}
            <div style={{ flex: 1, padding: '20px 16px 20px 28px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#6b6b80', letterSpacing: 1, textTransform: 'uppercase' }}>
                  Item Belanja
                </div>
                <div style={{
                  background: 'rgba(108,99,255,0.12)', border: '1px solid rgba(108,99,255,0.2)',
                  borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 700, color: '#a78bfa',
                }}>
                  {cart.items.length} produk
                </div>
              </div>

              {/* Table header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '64px 1fr 110px 64px 120px',
                gap: 12, padding: '10px 16px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '10px 10px 0 0',
                border: '1px solid rgba(255,255,255,0.06)', borderBottom: 'none',
              }}>
                {['', 'PRODUK', 'HARGA', 'QTY', 'SUBTOTAL'].map((h, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontWeight: 700, color: '#3a3a4a',
                    letterSpacing: 0.8, textAlign: i > 1 ? 'right' : 'left',
                  }}>{h}</span>
                ))}
              </div>

              {/* Items */}
              <div style={{
                flex: 1, overflowY: 'auto',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '0 0 12px 12px',
              }}>
                {cart.items.map((item, i) => (
                  <div
                    key={item.id}
                    className="item-row"
                    style={{
                      display: 'grid', gridTemplateColumns: '64px 1fr 110px 64px 120px',
                      gap: 12, padding: '12px 16px', alignItems: 'center',
                      borderBottom: i < cart.items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                      animationDelay: `${i * 0.05}s`,
                    }}
                  >
                    {/* Gambar produk */}
                    <ProductImage item={item} size={52} />

                    {/* Nama */}
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#e8e8f0' }}>{item.name}</span>

                    {/* Harga */}
                    <span style={{
                      fontSize: 13, color: '#6b6b80', textAlign: 'right',
                      fontFamily: "'DM Mono', monospace",
                    }}>{formatRupiah(item.price)}</span>

                    {/* Qty */}
                    <div style={{
                      background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                      borderRadius: 20, padding: '4px 0',
                      textAlign: 'center', fontWeight: 800, fontSize: 14, color: 'white',
                      boxShadow: '0 2px 8px rgba(108,99,255,0.3)',
                    }}>{item.quantity}</div>

                    {/* Subtotal */}
                    <span style={{
                      fontSize: 15, fontWeight: 700, color: '#43e97b',
                      textAlign: 'right', fontFamily: "'DM Mono', monospace",
                    }}>{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Panel */}
            <div style={{ width: 300, padding: '20px 28px 20px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Kasir info */}
              {cart.kasirName && (
                <div style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14, padding: '14px 16px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #6c63ff, #a78bfa)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 800, color: 'white', flexShrink: 0,
                  }}>
                    {cart.kasirName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{cart.kasirName}</div>
                    <div style={{ fontSize: 12, color: '#6c63ff' }}>{cart.branchName}</div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 14, padding: 16, flex: 1,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#3a3a4a', letterSpacing: 1, marginBottom: 14, textTransform: 'uppercase' }}>
                  Ringkasan
                </div>
                {[
                  ['Subtotal', formatRupiah(cart.subtotal)],
                  ['Diskon', `- ${formatRupiah(cart.discount || 0)}`],
                  ['Pajak (11%)', formatRupiah(cart.tax)],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ color: '#6b6b80', fontSize: 13 }}>{k}</span>
                    <span style={{ color: '#a0a0b0', fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{v}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, marginTop: 6 }}>
                  <div style={{ fontSize: 11, color: '#6b6b80', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>Total</div>
                  <div style={{
                    fontSize: 32, fontWeight: 800, color: '#43e97b',
                    letterSpacing: -0.5, fontFamily: "'DM Mono', monospace",
                  }}>
                    {formatRupiah(cart.total)}
                  </div>
                </div>
              </div>

              {/* Payment method */}
              {cart.paymentMethod && (
                <div style={{
                  background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.15)',
                  borderRadius: 12, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 20 }}>{paymentIcons[cart.paymentMethod] || '💳'}</span>
                  <span style={{ color: '#a78bfa', fontWeight: 700, fontSize: 15 }}>
                    {paymentLabels[cart.paymentMethod] || cart.paymentMethod}
                  </span>
                </div>
              )}

              {/* Total items */}
              <div style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 12, padding: '12px 16px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ color: '#6b6b80', fontSize: 13 }}>Total Item</span>
                <span style={{ fontWeight: 800, fontSize: 18 }}>
                  {cart.items.reduce((sum, i) => sum + i.quantity, 0)} pcs
                </span>
              </div>
            </div>
          </>

        ) : (
          /* Idle */
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 20,
            background: 'radial-gradient(ellipse at 50% 60%, rgba(108,99,255,0.06) 0%, transparent 60%)',
          }}>
            <div style={{
              width: 110, height: 110,
              background: 'rgba(108,99,255,0.08)', border: '1px solid rgba(108,99,255,0.15)',
              borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 52, boxShadow: '0 0 60px rgba(108,99,255,0.1)',
            }}>◈</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1, marginBottom: 10 }}>
                Selamat Datang
              </div>
              <div style={{ fontSize: 16, color: '#4a4a5a' }}>Menunggu transaksi dari kasir...</div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  backgroundColor: '#6c63ff',
                  animation: `pulse 1.4s ${i * 0.2}s infinite`,
                  opacity: 0.4,
                }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '10px 28px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: '#3a3a4a', fontSize: 12 }}>
          {time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
        {lastUpdate && (
          <span style={{ color: '#3a3a4a', fontSize: 12 }}>
            Update terakhir: {lastUpdate.toLocaleTimeString('id-ID')}
          </span>
        )}
      </div>
    </div>
  )
}