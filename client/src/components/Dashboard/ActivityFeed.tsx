interface Activity {
  id: number
  type: string
  description: string
  created_at: string
}

interface Props {
  activities: Activity[]
}

export function ActivityFeed({ activities }: Props) {
  return (
    <div style={{ background: '#111111', border: '1px solid #333333', borderRadius: '8px', padding: '24px', fontFamily: "'Outfit', sans-serif" }}>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', marginBottom: '16px', margin: '0 0 16px 0' }}>Activity</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
        {activities.map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff', marginTop: '6px', flexShrink: 0 }} />
            <div>
              <p style={{ color: '#aaaaaa', fontSize: '14px', margin: '0 0 2px 0' }}>{a.description}</p>
              <p style={{ color: '#666666', fontSize: '12px', margin: 0 }}>
                {a.type} &middot; {new Date(a.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <p style={{ color: '#666666', fontSize: '14px', margin: 0 }}>No activity yet.</p>
        )}
      </div>
    </div>
  )
}
