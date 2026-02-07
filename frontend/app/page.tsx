import Link from 'next/link'
import React from 'react'

export default function Home() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <header className="flex flex-col items-center text-center gap-6">
        <h1 className="text-3xl sm:text-5xl font-bold">Donate blood. Save lives.</h1>
        <p className="text-gray-600 max-w-xl">A simple platform connecting donors and hospitals in emergencies.</p>
        <div className="flex gap-4">
          <Link href="/auth/signup" className="btn-blood px-4 py-2 rounded shadow">Donate Blood</Link>
          <Link href="/auth/login" className="px-4 py-2 rounded border">Request Blood</Link>
        </div>
      </header>

      <section className="mt-12 grid gap-8 sm:grid-cols-2">
        <div className="p-6 rounded shadow-sm border">
          <h3 className="font-semibold">How it works</h3>
          <ol className="mt-2 text-sm text-gray-600 list-decimal list-inside">
            <li>Hospitals post emergency requests.</li>
            <li>Nearby donors get notified and respond.</li>
            <li>Requests are fulfilled and tracked.</li>
          </ol>
        </div>

        <div className="p-6 rounded shadow-sm border">
          <h3 className="font-semibold">Stats</h3>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">120</div>
              <div className="text-sm text-gray-500">Hospitals</div>
            </div>
            <div>
              <div className="text-2xl font-bold">4,532</div>
              <div className="text-sm text-gray-500">Lives Saved</div>
            </div>
            <div>
              <div className="text-2xl font-bold">9,101</div>
              <div className="text-sm text-gray-500">Donations</div>
            </div>
          </div>
        </div>
      </section>

      <div className="text-center py-20">
        <h1 className="text-3xl font-bold mb-4">BloodLine</h1>
        <p className="mb-6">Connect donors, hospitals and admins to save lives.</p>
        <div className="flex justify-center gap-4">
          <Link href="/auth/signup" className="px-4 py-2 bg-blue-600 text-white rounded">Get Started</Link>
          <Link href="/auth/login" className="px-4 py-2 border rounded">Login</Link>
        </div>
      </div>
    </div>
  )
}
