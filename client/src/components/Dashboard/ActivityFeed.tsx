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
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
      <h3 className="text-lg font-heading text-white mb-4">Activity</h3>

      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {activities.map((a) => (
          <div key={a.id} className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />
            <div>
              <p className="text-slate-300 font-body text-sm">{a.description}</p>
              <p className="text-slate-500 font-body text-xs mt-0.5">
                {a.type} &middot; {new Date(a.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <p className="text-slate-500 font-body text-sm">No activity yet.</p>
        )}
      </div>
    </div>
  )
}
