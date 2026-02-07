"use client"
import React from 'react'
import { useAuth } from '../../../context/AuthContext'
import useFetchEmergencyRequests from '../../../hooks/useFetchEmergencyRequests'
import EmergencyList from '../../../components/EmergencyList'
import Button from '../../../components/Button'
import { emergencyApi } from '../../../lib/api'
import ProtectedRoute from '../../../components/ProtectedRoute'
import { useToast } from '../../../components/ToastContext'

export default function DonorDashboard() {
  const { user } = useAuth()
  const { data, loading } = useFetchEmergencyRequests({ city: 'current-city' })
  const toast = useToast()

  const createRequest = async () => {
    try {
      await emergencyApi.create({ bloodGroup: 'O+', units: 2, city: 'Sample City', urgency: 'medium' })
      toast.push({
        title: 'Created', description: 'Emergency request created', type: 'success',
        id: ''
      })
    } catch (e: any) {
      toast.push({
        title: 'Error', description: e?.message || 'Failed to create request', type: 'error',
        id: ''
      })
    }
  }

  return (
    <ProtectedRoute role={'donor'}>
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-semibold">Donor dashboard</h1>
      <div className="mt-4 grid gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <section className="mb-6">
            <h2 className="font-semibold">Nearby emergency requests</h2>
            {loading ? <div>Loading...</div> : <EmergencyList items={data} />}
          </section>
        </div>
        <aside>
          <div className="p-4 rounded border">
            <div className="font-semibold">Profile</div>
            <div className="text-sm text-gray-600">
            {user ? <div className="user">{user.name}</div> : <div>No user</div>}
            </div>

            <div className="text-sm text-gray-600">Email: {user?.email}</div>
            <div className="mt-4">
              <Button onClick={createRequest}>Request Blood</Button>
            </div>
          </div>
        </aside>
      </div>
    </div>
    </ProtectedRoute>
  )
}
