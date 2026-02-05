"use client"

import Link from "next/link"
import { useAuth } from "../context/AuthContext"

export default function Navbar() {
  const { user, loading, signout } = useAuth()

  return (
    <nav className="w-full bg-white border-b">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          BloodLine
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/about">About</Link>
          <Link href="/emergency">Emergency</Link>
          {!loading && !user && (
            <>
              <Link
                href="/auth/login"
                className="px-3 py-1 rounded bg-blue-600 text-white"
              >
                Login
              </Link>
              <Link
                href="/auth/signup"
                className="px-3 py-1 rounded border"
              >
                Signup
              </Link>
            </>
          )}
          {!loading && user && (
            <>
              <Link
                href="/dashboard"
                className="px-3 py-1 rounded"
              >
                Dashboard
              </Link>
              <button
                onClick={() => signout()}
                className="px-3 py-1 rounded bg-red-500 text-white"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
