import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface Client {
  id: number
  founder_name: string
  company_name: string
  stage: 'phase1' | 'phase2' | 'churned'
  phase1_fee: number
  phase2_monthly_fee: number
}

interface Props {
  token: string
  on401: () => void
}

export function RevenueOverview({ token, on401 }: Props) {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401) { on401(); return null }
        return res.json()
      })
      .then((data) => {
        if (data) setClients(data)
      })
      .finally(() => setLoading(false))
  }, [token, on401])

  if (loading) return <p className="text-gray-400 font-body">Loading...</p>

  const totalPhase1 = clients.reduce((sum, c) => sum + (c.phase1_fee || 0), 0)
  const activeMRR = clients
    .filter((c) => c.stage === 'phase2')
    .reduce((sum, c) => sum + (c.phase2_monthly_fee || 0), 0)
  const pipelineValue = clients
    .filter((c) => c.stage === 'phase1')
    .reduce((sum, c) => sum + (c.phase1_fee || 0), 0)

  const fmt = (n: number) => `$${n.toLocaleString()}`

  return (
    <div>
      <h2 className="text-2xl font-heading text-white mb-6">Revenue</h2>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-gray-400 font-body text-xs uppercase tracking-wider mb-1">Total Phase 1 Revenue</p>
          <p className="text-3xl font-heading text-white">{fmt(totalPhase1)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-gray-400 font-body text-xs uppercase tracking-wider mb-1">Active MRR</p>
          <p className="text-3xl font-heading text-brand-indigo">{fmt(activeMRR)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <p className="text-gray-400 font-body text-xs uppercase tracking-wider mb-1">Pipeline Value</p>
          <p className="text-3xl font-heading text-brand-violet">{fmt(pipelineValue)}</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-6 py-3 text-gray-400 font-body text-xs uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-gray-400 font-body text-xs uppercase tracking-wider">Stage</th>
              <th className="px-6 py-3 text-gray-400 font-body text-xs uppercase tracking-wider">Phase 1 Fee</th>
              <th className="px-6 py-3 text-gray-400 font-body text-xs uppercase tracking-wider">Monthly Fee</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-gray-800/50">
                <td className="px-6 py-4">
                  <p className="text-white font-body text-sm">{c.founder_name}</p>
                  <p className="text-gray-500 font-body text-xs">{c.company_name}</p>
                </td>
                <td className="px-6 py-4 text-gray-400 font-body text-sm">{c.stage}</td>
                <td className="px-6 py-4 text-white font-body text-sm">{fmt(c.phase1_fee || 0)}</td>
                <td className="px-6 py-4 text-white font-body text-sm">{fmt(c.phase2_monthly_fee || 0)}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 font-body text-sm">
                  No clients yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
