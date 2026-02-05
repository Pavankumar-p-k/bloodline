"use client"
import React from 'react'
import { AuthProvider } from '../context/AuthContext'
import Navbar from './Navbar'
import { ToastProvider } from './ToastContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Navbar />
        {children}
      </ToastProvider>
    </AuthProvider>
  )
}
