"use client"

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react'
import { useRouter } from 'next/navigation'
import { useToast } from '../components/ToastContext'

/* ================= TYPES ================= */

type User = {
  id: string
  name?: string
  email: string
  role?: 'donor' | 'hospital' | 'admin'
}

type AuthContextType = {
  user: User | null
  token: string | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (email: string, password: string, role?: User['role']) => Promise<void>
  signout: () => void
  refreshUser: () => Promise<void>
}

/* ================= CONTEXT ================= */

const AuthContext = createContext<AuthContextType | undefined>(undefined)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

/* ================= PROVIDER ================= */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()
  const toast = useToast()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const t = localStorage.getItem('bl_token')
    const u = localStorage.getItem('bl_user')

    if (t) setToken(t)
    if (u) {
      try {
        setUser(JSON.parse(u))
      } catch {
        setUser(null)
      }
    }

    setLoading(false)

    if (t) refreshUser().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = (t: string | null, u: User | null) => {
    setToken(t)
    setUser(u)

    if (typeof window !== 'undefined') {
      if (t) localStorage.setItem('bl_token', t)
      else localStorage.removeItem('bl_token')

      if (u) localStorage.setItem('bl_user', JSON.stringify(u))
      else localStorage.removeItem('bl_user')
    }
  }

  /* ================= ACTIONS ================= */

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Login failed' }))
      toast?.error(err.message || 'Login failed')
      throw new Error(err.message || 'Login failed')
    }

    const data = await res.json()
    persist(data.token, data.user)
    toast?.success('Logged in')
    router.push('/dashboard')
  }

  const signup = async (
    email: string,
    password: string,
    role: User['role'] = 'donor'
  ) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Signup failed' }))
      toast?.error(err.message || 'Signup failed')
      throw new Error(err.message || 'Signup failed')
    }

    toast?.success('Signup successful. Please login.')
    router.push('/auth/login')
  }

  const refreshUser = async () => {
    if (!token) return

    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      persist(null, null)
      return
    }

    const data = await res.json()
    setUser(data.user)
    localStorage.setItem('bl_user', JSON.stringify(data.user))
  }

  const signout = () => {
    persist(null, null)
    toast?.info('Signed out')
    router.push('/auth/login')
  }

  return (
    <AuthContext.Provider
      value={{ user, token, loading, login, signup, signout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/* ================= HOOK ================= */

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
