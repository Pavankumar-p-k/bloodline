"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "../../../context/AuthContext"
import { HeartPulse, Lock, Mail, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg(null)
    try {
      const role = await login(email, password)
      if (role === "donor") {
        router.push("/donor/dashboard")
      } else if (role === "hospital") {
        router.push("/hospital/dashboard")
      } else if (role === "admin") {
        router.push("/admin/dashboard")
      } else {
        router.push("/")
      }
    } catch (err: any) {
      console.error("Login failed:", err)
      setErrorMsg(err?.message || "Invalid email or password. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#0A0A0A]">
      <div className="max-w-md w-full space-y-8 bg-[#1A1A1A] p-8 rounded-2xl border border-red-900/30 shadow-[0_8px_32px_0_rgba(196,30,58,0.1)] backdrop-blur">
        
        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-950/50 border border-red-600/40 text-red-500 mb-4 animate-pulse">
            <HeartPulse className="h-9 w-9" />
          </div>
          <h2 className="text-3xl font-extrabold text-[#F5F5F5] tracking-tight">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-[#9090A0]">
            Sign in to your Bloodline response account
          </p>
        </div>

        {/* Error alert */}
        {errorMsg && (
          <div className="bg-red-950/40 border border-red-600/50 text-red-400 p-3 rounded-lg text-sm text-center">
            {errorMsg}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 border border-zinc-800 bg-[#0F0F0F] text-[#F5F5F5] placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent transition-all text-sm"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-xl relative block w-full pl-10 pr-3 py-3 border border-zinc-800 bg-[#0F0F0F] text-[#F5F5F5] placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#C41E3A] focus:border-transparent transition-all text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-[#C41E3A] hover:bg-[#8B0000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0A0A0A] focus:ring-[#C41E3A] transition-all disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  Sign in <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </button>
          </div>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-[#9090A0]">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="font-medium text-[#C41E3A] hover:text-[#8B0000] underline underline-offset-4">
              Sign up now
            </Link>
          </p>
        </div>

      </div>
    </div>
  )
}
