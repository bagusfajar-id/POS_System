import { useEffect, useState, useCallback } from 'react'
import api from '../lib/api'

interface Branch { id: string; name: string; address?: string; phone?: string; createdAt: string }

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Branch | null>(null)
  const [form, setForm] = useState({ name: '', address: '', phone: '' })

  const load = useCallback(async () => {
    const { data } = await api.get<Branch[]>('/branches')
    setBranches(data)
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = () => { setEditing(null); setForm({ name: '', address: '', phone: '' }); setModal(true) }
  const openEdit = (b: Branch) => {
    setEditing(b)
    setForm({ name: b.name, address: b.address || '', phone: b.phone || '' })
    setModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing) await api.put(`/branches/${editing.id}`, form)
    else await api.post('/branches', form)
    setModal(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus cabang ini?')) return
    await api.delete(`/branches/${id}`)
    load()
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Cabang</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>{branches.length} cabang aktif</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Tambah Cabang</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {branches.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
            Belum ada cabang
          </div>
        )}
        {branches.map(b => (
          <div key={b.id} className="glass" style={{ padding: 24 }}>
            <div style={{
              width: 44, height: 44, background: 'rgba(108,99,255,0.1)',
              borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, marginBottom: 16
            }}>🏪</div>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{b.name}</h3>
            {b.address && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>📍 {b.address}</p>}
            {b.phone && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>📞 {b.phone}</p>}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn-ghost" style={{ flex: 1, fontSize: 12 }} onClick={() => openEdit(b)}>Edit</button>
              <button className="btn-danger" style={{ fontSize: 12 }} onClick={() => handleDelete(b.id)}>Hapus</button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="glass fade-in" style={{ width: 440, padding: 32 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>
              {editing ? 'Edit Cabang' : 'Tambah Cabang'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label>Nama Cabang *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <label>Alamat</label>
                  <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
                </div>
                <div>
                  <label>No. Telepon</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
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