import { useEffect, useState, useCallback } from 'react'
import api from '../lib/api'

interface Category { id: string; name: string; createdAt: string }

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')

  const load = useCallback(async () => {
    const { data } = await api.get<Category[]>('/categories')
    setCategories(data)
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setName(''); setModal(true) }
  const openEdit = (c: Category) => { setEditing(c); setName(c.name); setModal(true) }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) await api.put(`/categories/${editing.id}`, { name })
    else await api.post('/categories', { name })
    setModal(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus kategori ini?')) return
    await api.delete(`/categories/${id}`)
    load()
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Kategori</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{categories.length} kategori</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Tambah Kategori</button>
      </div>

      <div className="glass">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Nama Kategori</th>
              <th>Dibuat</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>Belum ada kategori</td></tr>
            )}
            {categories.map((c, i) => (
              <tr key={c.id}>
                <td style={{ color: 'var(--text-muted)', width: 40 }}>{i + 1}</td>
                <td><span className="badge badge-blue">{c.name}</span></td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {new Date(c.createdAt).toLocaleDateString('id-ID')}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => openEdit(c)}>Edit</button>
                    <button className="btn-danger" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => handleDelete(c.id)}>Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="glass fade-in" style={{ width: 400, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {editing ? 'Edit Kategori' : 'Tambah Kategori'}
            </h2>
            <form onSubmit={handleSubmit}>
              <label>Nama Kategori *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Contoh: Makanan" required />
              <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                <button type="button" className="btn-ghost" onClick={() => setModal(false)}>Batal</button>
                <button type="submit" className="btn-primary">{editing ? 'Simpan' : 'Tambah'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}