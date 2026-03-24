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
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-heading text-white mb-4">Activity</h3>

      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {activities.map((a) => (
          <div key={a.id} className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-brand-indigo mt-1.5 shrink-0" />
            <div>
              <p className="text-gray-300 font-body text-sm">{a.description}</p>
              <p className="text-gray-600 font-body text-xs mt-0.5">
                {a.type} &middot; {new Date(a.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
        {activities.length === 0 && (
          <p className="text-gray-600 font-body text-sm">No activity yet.</p>
        )}
      </div>
    </div>
  )
}
