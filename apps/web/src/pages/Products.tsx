import { useEffect, useState, useCallback, useRef } from 'react'
import api from '../lib/api'
import { formatRupiah } from '../lib/utils'
import { useAuthStore } from '../store/authStore'
import { canManageProducts } from '../lib/roles'
import type { Role } from '../lib/roles'

const API_URL = 'http://192.168.137.1:3001'

interface Product {
  id: string
  name: string
  barcode?: string
  price: number
  stock: number
  image?: string
  category?: { id: string; name: string }
  branch?: { id: string; name: string }
}
interface Category { id: string; name: string }
interface Branch { id: string; name: string }

function ProductImage({ src, name, size = 40 }: { src?: string; name: string; size?: number }) {
  const [error, setError] = useState(false)
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  if (!src || error) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 8,
        background: 'rgba(108,99,255,0.1)',
        border: '1px solid rgba(108,99,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.35, fontWeight: 800, color: '#6c63ff',
        flexShrink: 0,
      }}>
        {initials}
      </div>
    )
  }

  return (
    <img
      src={`${API_URL}${src}`}
      alt={name}
      onError={() => setError(true)}
      style={{
        width: size, height: size, borderRadius: 8,
        objectFit: 'cover', flexShrink: 0,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    />
  )
}

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState({
    name: '', barcode: '', price: '', stock: '', categoryId: '', branchId: ''
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { user } = useAuthStore()
  const role = (user?.role || 'CASHIER') as Role
  const canManage = canManageProducts(role)

  const load = useCallback(async () => {
    try {
      const [p, c, b] = await Promise.all([
        api.get<Product[]>('/products', { params: { search } }),
        api.get<Category[]>('/categories'),
        api.get<Branch[]>('/branches')
      ])
      setProducts(p.data)
      setCategories(c.data)
      setBranches(b.data)
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { load() }, [search, load])

  const openAdd = () => {
    setEditing(null)
    setForm({ name: '', barcode: '', price: '', stock: '', categoryId: '', branchId: '' })
    setImageFile(null)
    setImagePreview(null)
    setModal(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setForm({
      name: p.name, barcode: p.barcode || '',
      price: String(p.price), stock: String(p.stock),
      categoryId: p.category?.id || '', branchId: p.branch?.id || ''
    })
    setImageFile(null)
    setImagePreview(p.image ? `${API_URL}${p.image}` : null)
    setModal(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock) }
      let product: Product

      if (editing) {
        const res = await api.put<Product>(`/products/${editing.id}`, payload)
        product = res.data
      } else {
        const res = await api.post<Product>('/products', payload)
        product = res.data
      }

      // Upload gambar pakai fetch + token dari localStorage
      if (imageFile) {
        const formData = new FormData()
        formData.append('file', imageFile)
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_URL}/products/${product.id}/image`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        })
        if (!res.ok) {
          const err = await res.json()
          console.error('Upload error:', err)
          alert('Gagal upload gambar: ' + (err.message || err.error))
        }
      }

      setModal(false)
      load()
    } catch (err) {
      console.error('Submit error:', err)
      alert('Gagal menyimpan produk')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus produk ini?')) return
    await api.delete(`/products/${id}`)
    load()
  }

  const handleDeleteImage = async (id: string) => {
    if (!confirm('Hapus gambar produk ini?')) return
    await api.delete(`/products/${id}/image`)
    load()
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Produk</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            {products.length} produk terdaftar
          </p>
        </div>
        {canManage && (
          <button className="btn-primary" onClick={openAdd}>+ Tambah Produk</button>
        )}
      </div>

      <div style={{ marginBottom: 20, maxWidth: 360 }}>
        <input
          placeholder="🔍 Cari produk atau barcode..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="glass">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 52 }}>Foto</th>
                <th>Produk</th>
                <th>Barcode</th>
                <th>Kategori</th>
                <th>Harga</th>
                <th>Stok</th>
                <th>Cabang</th>
                {canManage && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 8 : 7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>
                    Belum ada produk
                  </td>
                </tr>
              )}
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <ProductImage src={p.image} name={p.name} size={40} />
                  </td>
                  <td style={{ fontWeight: 500 }}>{p.name}</td>
                  <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 12 }}>
                    {p.barcode || '-'}
                  </td>
                  <td>
                    {p.category ? <span className="badge badge-blue">{p.category.name}</span> : '-'}
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatRupiah(p.price)}</td>
                  <td>
                    <span className={`badge ${p.stock <= 5 ? 'badge-red' : p.stock <= 20 ? 'badge-yellow' : 'badge-green'}`}>
                      {p.stock} unit
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{p.branch?.name || '-'}</td>
                  {canManage && (
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => openEdit(p)}>Edit</button>
                        {p.image && (
                          <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12, color: 'var(--accent-2)' }}
                            onClick={() => handleDeleteImage(p.id)}>🗑 Foto</button>
                        )}
                        <button className="btn-danger" style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => handleDelete(p.id)}>Hapus</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {canManage && modal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 999
        }}>
          <div className="glass fade-in" style={{ width: 520, padding: 32, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {editing ? 'Edit Produk' : 'Tambah Produk'}
            </h2>
            <form onSubmit={handleSubmit}>

              {/* Upload Gambar */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-muted)' }}>
                  Foto Produk
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%', height: 160,
                    borderRadius: 12,
                    border: '2px dashed rgba(108,99,255,0.3)',
                    background: 'rgba(108,99,255,0.04)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', overflow: 'hidden',
                    transition: 'border-color 0.2s',
                    position: 'relative',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(108,99,255,0.6)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(108,99,255,0.3)')}
                >
                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="preview"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0, transition: 'opacity 0.2s',
                      }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                      >
                        <span style={{ color: 'white', fontSize: 13, fontWeight: 600 }}>
                          🖼 Ganti Foto
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        Klik untuk upload foto
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        JPG, PNG, WebP — max 5MB
                      </div>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageChange}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label>Nama Produk *</label>
                  <input
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Contoh: Nasi Goreng"
                    required
                  />
                </div>
                <div>
                  <label>Barcode</label>
                  <input
                    value={form.barcode}
                    onChange={e => setForm({ ...form, barcode: e.target.value })}
                    placeholder="Scan atau ketik"
                  />
                </div>
                <div>
                  <label>Harga *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm({ ...form, price: e.target.value })}
                    placeholder="25000"
                    required
                  />
                </div>
                <div>
                  <label>Stok</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={e => setForm({ ...form, stock: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label>Kategori</label>
                  <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">-- Pilih Kategori --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label>Cabang</label>
                  <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })}>
                    <option value="">-- Pilih Cabang --</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Batal</button>
                <button type="submit" className="btn-primary" disabled={uploading}>
                  {uploading ? '⏳ Menyimpan...' : editing ? 'Simpan Perubahan' : 'Tambah Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}