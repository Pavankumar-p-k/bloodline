"use client"
import React, { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import { Role } from '../types'

export default function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: Role }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/auth/login')
      } else if (role && user.role !== role) {
        router.push('/')
      }
    }
  }, [user, loading, role])

  if (loading || !user) return <div className="p-4">Loading...</div>
  return <>{children}</>
}
