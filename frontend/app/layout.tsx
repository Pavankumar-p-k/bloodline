"use client";

import React, { useEffect } from "react";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import { ToastProvider } from "../components/ToastContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  
  // Register Service Worker for PWA support
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("ServiceWorker registration successful with scope: ", reg.scope);
          })
          .catch((err) => {
            console.warn("ServiceWorker registration failed: ", err);
          });
      });
    }
  }, []);

  return (
    <html lang="en" className="h-full bg-[#0A0A0A]">
      <head>
        <title>Bloodline - India Blood Response Network</title>
        <meta name="description" content="Connect blood donors to patients in real time across India" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#C41E3A" />
        <link rel="apple-touch-icon" href="https://images.unsplash.com/photo-584515979956-d9f6e5d09982?w=192&h=192&fit=crop" />
      </head>
      <body className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] font-sans antialiased flex flex-col h-full">
        <AuthProvider>
          <ToastProvider>
            <div className="flex flex-col min-h-screen pb-16 sm:pb-0">
              <Navbar />
              <main className="flex-1 w-full mx-auto">{children}</main>
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
