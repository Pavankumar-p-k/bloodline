"use client"
import React, { useEffect, useState } from 'react'
import ProtectedRoute from '../../../../components/ProtectedRoute'
import { hospitalApi } from '../../../../lib/api'

export default function HospitalProfilePage() {
  const [profile, setProfile] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    hospitalApi.profile()
      .then((res) => setProfile(res.data))
      .catch((err) => {
        console.error("Failed to load profile:", err)
        setError("Failed to load profile")
      })
  }, [])

  return (
    <ProtectedRoute role={'hospital'}>
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-semibold">Hospital profile</h1>
        <div className="mt-4 p-4 border rounded bg-white">
          {error ? (
            <div className="text-sm text-vital">{error}</div>
          ) : !profile ? (
            <div className="text-sm text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="font-semibold">{profile.name || "Unnamed Hospital"}</div>
              <div className="text-sm text-gray-600">{profile.email}</div>
              <div className="mt-2 text-sm">Address: {profile.address || "—"}</div>
              <div className="mt-2 text-sm">Phone: {profile.phone || "—"}</div>
              {profile.license_number && (
                <div className="mt-2 text-sm">License: {profile.license_number}</div>
              )}
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
