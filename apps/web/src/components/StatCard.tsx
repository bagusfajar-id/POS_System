interface Props {
  label: string
  value: string
  icon: string
  color?: string
  sub?: string
}

export default function StatCard({ label, value, icon, color = 'var(--accent)', sub }: Props) {
  return (
    <div className="glass fade-in" style={{ padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', top: -10, right: -10,
        width: 80, height: 80,
        background: color,
        borderRadius: '50%',
        opacity: 0.08
      }} />
      <div style={{
        width: 40, height: 40,
        background: color + '20',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, marginBottom: 16
      }}>{icon}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'Syne', fontSize: 24, fontWeight: 700 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}