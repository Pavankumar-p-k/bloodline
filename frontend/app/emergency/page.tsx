"use client"

import { useState } from "react"
import axios from "axios"
import { useAuth } from "../../context/AuthContext"
import { useToast } from "../../components/ToastContext"

export default function EmergencyPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const { token } = useAuth()
  const toast = useToast()

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || ""

  const submitRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    const form = e.currentTarget
    const data = {
      blood_group: form.blood_group.value,
      units: Number(form.units.value),
      city: form.city.value,
      urgency_level: form.urgency.value,
    }

    try {
      await axios.post(
        `${API_BASE}/api/emergency/request`,
        data,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      )

      const successMsg = "Emergency request created successfully 🚑"
      setMessage(successMsg)
      toast?.success?.(successMsg)
      form.reset()
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || "Failed to create emergency request"
      setMessage(errMsg)
      toast?.error?.(errMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-red-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-red-600 mb-6">
          Emergency Blood Request
        </h1>

        <form onSubmit={submitRequest} className="space-y-4">
          <select
            name="blood_group"
            required
            className="w-full border p-2 rounded"
            defaultValue=""
          >
            <option value="" disabled>Select Blood Group</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>

          <input
            name="units"
            type="number"
            min={1}
            required
            placeholder="Units Required"
            className="w-full border p-2 rounded"
          />

          <input
            name="city"
            required
            placeholder="City"
            className="w-full border p-2 rounded"
          />

          <select
            name="urgency"
            required
            className="w-full border p-2 rounded"
            defaultValue=""
          >
            <option value="" disabled>Urgency Level</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="critical">Critical</option>
          </select>

          <button
            disabled={loading}
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 transition"
          >
            {loading ? "Submitting..." : "Submit Emergency Request"}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-gray-700">
            {message}
          </p>
        )}
      </div>
    </main>
  )
}
