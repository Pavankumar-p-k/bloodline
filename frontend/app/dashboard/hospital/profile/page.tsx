"use client"
import React, { useEffect, useState } from 'react'
import ProtectedRoute from '../../../../components/ProtectedRoute'
import { hospital } from '../../../../lib/api'
import { useToast } from '../../../../components/ToastContext'

export default function HospitalProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const toast = useToast()

  useEffect(() => {
    hospital.getProfile?.().then((res) => setProfile(res)).catch(() => toast.push({ title: 'Error', description: 'Failed to load profile', type: 'error' }))
  }, [])

  if (!profile) return (<ProtectedRoute role={'hospital'}><div className="p-4">Loading...</div></ProtectedRoute>)

  return (
    <ProtectedRoute role={'hospital'}>
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-semibold">Hospital profile</h1>
        <div className="mt-4 p-4 border rounded">
          <div className="font-semibold">{profile.name}</div>
          <div className="text-sm text-gray-600">{profile.email}</div>
          <div className="mt-2 text-sm">Address: {profile.address}</div>
          <div className="mt-2 text-sm">Phone: {profile.phone}</div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
