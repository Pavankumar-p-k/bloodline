"use client"
import React, { useEffect, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { hospital } from '../../../lib/api'
import EmergencyList from '../../../components/EmergencyList'
import Button from '../../../components/Button'
import ProtectedRoute from '../../../components/ProtectedRoute'
import InventoryEditor from '../../../components/InventoryEditor'
import { useToast } from '../../../components/ToastContext'

export default function HospitalDashboard() {
  const { user } = useAuth()
  const [inventory, setInventory] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])

  useEffect(() => {
    hospital.inventory.list().then((res) => setInventory(res || [])).catch(() => {})
    hospital.requests().then((res) => setRequests(res || [])).catch(() => {})
  }, [])

  const fulfill = async (id: string) => {
    try {
      await hospital.fulfill({ requestId: id })
      toast.push({ title: 'Fulfilled', description: 'Request fulfilled', type: 'success' })
      setRequests((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      toast.push({ title: 'Error', description: 'Failed to fulfill', type: 'error' })
    }
  }

  return (
    <ProtectedRoute role={'hospital'}>
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-semibold">Hospital dashboard</h1>
      <div className="mt-4 grid gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <section>
            <h2 className="font-semibold">Incoming emergency requests</h2>
            <EmergencyList items={requests} onFulfill={fulfill} />
          </section>
        </div>
        <aside>
          <div className="p-4 rounded border">
            <div className="font-semibold">Inventory</div>
            <div className="mt-2 space-y-2">
              {inventory.length === 0 && <div className="text-sm text-gray-500">No inventory</div>}
              {inventory.map((it: any) => (
                <div key={it.id} className="text-sm">
                  {it.bloodGroup} — {it.units} units (expires: {it.expiry})
                </div>
              ))}
            </div>
            <div className="mt-4">
              <InventoryEditor onSaved={(it: any) => setInventory((prev) => [it, ...prev])} />
            </div>
          </div>
        </aside>
      </div>
    </div>
    </ProtectedRoute>
  )
}
