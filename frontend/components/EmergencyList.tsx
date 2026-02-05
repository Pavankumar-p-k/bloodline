"use client"
import React from 'react'

type Req = {
  id: string
  bloodGroup: string
  units: number
  city: string
  urgency: 'low' | 'medium' | 'high'
  status?: string
}

export default function EmergencyList({ items = [], onFulfill }: { items?: Req[]; onFulfill?: (id: string) => void }) {
  if (!items.length) return <div className="text-sm text-gray-500">No requests found.</div>

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.id} className={`p-3 rounded border ${r.urgency === 'high' ? 'border-red-300 bg-red-50' : 'bg-white'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">{r.bloodGroup} • {r.units} units</div>
              <div className="text-sm text-gray-600">{r.city} • {r.urgency.toUpperCase()}</div>
            </div>
            <div className="flex gap-2">
              {onFulfill && (
                <button onClick={() => onFulfill(r.id)} className="px-3 py-1 bg-blood text-white rounded">Fulfill</button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
