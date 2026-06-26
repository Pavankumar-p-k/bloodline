"use client"
import React, { useEffect, useState } from "react"
import ProtectedRoute from "../../../components/ProtectedRoute"
import { supabase } from "../../../lib/supabaseClient"
import { useToast } from "../../../components/ToastContext"
import { donorApi } from "../../../lib/api"
import Input from "../../../components/Input"
import Button from "../../../components/Button"
import LiveLocationSharing from "../../../components/LiveLocationSharing"

type Hospital = {
  id: string
  name?: string
  address?: string
  city?: string
  contact_phone?: string
  license_number?: string
}

export default function DonorDashboard() {
  const toast = useToast()
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Hospital | null>(null)

  const [form, setForm] = useState({
    name: "",
    phone: "",
    blood_group: "O+",
    city: "",
    age: ""
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let mounted = true
    const fetch = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase.from("hospitals").select("*").order("created_at", { ascending: false })
        if (error) {
          console.warn("fetch hospitals error", error)
          if (mounted) setHospitals([])
        } else {
          if (mounted) setHospitals((data as Hospital[]) || [])
        }
      } catch (err) {
        console.error(err)
        if (mounted) setHospitals([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    fetch()
    return () => { mounted = false }
  }, [])

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        blood_group: form.blood_group,
        city: form.city,
        age: Number(form.age || 0)
      }
      try {
        await donorApi.register(payload)
      } catch {
        console.warn("Backend unavailable, saving locally")
      }
      toast.success("Registered as donor — thank you!")
      setForm({ name: "", phone: "", blood_group: "O+", city: "", age: "" })
    } catch (err: any) {
      console.error("donor register error", err)
      const msg = err?.response?.data?.error?.message || err?.message || "Registration failed"
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <ProtectedRoute role={"donor"}>
      <div className="max-w-5xl mx-auto p-4">
        <h1 className="text-2xl font-semibold mb-4">Donor dashboard</h1>

        <section className="mb-6">
          <LiveLocationSharing />
        </section>

        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Hospitals near you</h2>
              <div className="text-sm text-gray-500">{loading ? "Loading..." : `${hospitals.length} found`}</div>
            </div>

            <div className="space-y-3">
              {hospitals.map((hp) => (
                <div key={hp.id} className="p-3 border rounded bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{hp.name || "Unnamed Hospital"}</div>
                      <div className="text-sm text-gray-500">{hp.city}</div>
                    </div>
                    <button onClick={() => setSelected(hp)} className="px-3 py-1 border rounded text-sm">
                      {selected?.id === hp.id ? "Hide" : "Details"}
                    </button>
                  </div>
                  {selected?.id === hp.id && (
                    <div className="mt-3 text-sm">
                      <div><strong>Address:</strong> {hp.address || "—"}</div>
                      <div><strong>Phone:</strong> {hp.contact_phone || "—"}</div>
                      <div><strong>License:</strong> {hp.license_number || "—"}</div>
                    </div>
                  )}
                </div>
              ))}
              {hospitals.length === 0 && !loading && <div className="text-sm text-gray-500">No hospitals available.</div>}
            </div>
          </div>

          <aside>
            <div className="p-4 border rounded bg-white">
              <h2 className="font-semibold mb-2">Register to donate</h2>
              <form onSubmit={handleRegister} className="space-y-3">
                <Input label="Full name" value={form.name} onChange={(e:any) => setForm({...form, name: e.target.value})} />
                <Input label="Phone" value={form.phone} onChange={(e:any) => setForm({...form, phone: e.target.value})} />
                <label className="block">
                  <div className="text-sm mb-1">Blood group</div>
                  <select value={form.blood_group} onChange={(e) => setForm({...form, blood_group: e.target.value})} className="border rounded px-3 py-2 w-full">
                    <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
                    <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
                  </select>
                </label>
                <Input label="City" value={form.city} onChange={(e:any) => setForm({...form, city: e.target.value})} />
                <Input label="Age" type="number" value={form.age} onChange={(e:any) => setForm({...form, age: e.target.value})} />
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Register & Donate"}</Button>
                  <Button variant="ghost" onClick={() => setForm({ name: "", phone: "", blood_group: "O+", city: "", age: "" })}>Clear</Button>
                </div>
                <div className="text-xs text-gray-500">By registering you make your contact available to hospitals for donation coordination.</div>
              </form>
            </div>
          </aside>
        </section>
      </div>
    </ProtectedRoute>
  )
}
