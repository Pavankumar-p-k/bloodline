'use client'
import './globals.css'
import Navbar from '../components/Navbar'
import { ToastProvider } from '../components/ToastContext'
import { AuthProvider } from '../context/AuthContext'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-slate-900">
        <ToastProvider>
          <AuthProvider>
            <Navbar />
            <main className="container mx-auto px-4 py-6">{children}</main>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
