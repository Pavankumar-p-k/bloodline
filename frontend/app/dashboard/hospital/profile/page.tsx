"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "../../../../components/ProtectedRoute";
import { useAuth } from "../../../../context/AuthContext";
import { supabase } from "../../../../lib/supabaseClient";
import { useToast } from "../../../../components/ToastContext";
import { Building2, MapPin, Phone, Droplets, Save, Loader2 } from "lucide-react";

const HOSPITAL_TYPES = ["Government", "Private", "Trust", "NGO", "Clinic"];

export default function HospitalProfilePage() {
  const { user } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [hospitalName, setHospitalName] = useState("");
  const [type, setType] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const { data: h } = await supabase.from("hospital_profiles").select("*").eq("id", user.id).single();
      if (p) {
        setProfile(p);
        setHospitalName(p.full_name || "");
        setCity(p.city || "");
        setPhone(p.phone || "");
      }
      if (h) {
        setHospital(h);
        setType(h.hospital_type || "");
        setAddress(h.address || "");
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from("profiles").update({ full_name: hospitalName, city, phone }).eq("id", user?.id);
      await supabase.from("hospital_profiles").update({ hospital_name: hospitalName, hospital_type: type, address: `${address}, ${city}`, phone }).eq("id", user?.id);
      toast.push({ title: "Profile saved", description: "Your changes have been updated.", type: "success", id: "hprof-saved" });
    } catch {
      toast.push({ title: "Error", description: "Failed to save profile.", type: "error", id: "hprof-err" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-void flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-vital animate-spin" />
      </main>
    );
  }

  return (
    <ProtectedRoute role="hospital">
      <main className="min-h-screen bg-void text-text pb-16 px-4">
        <div className="max-w-2xl mx-auto space-y-8 pt-8">
          <header className="bg-surface border border-border rounded-2xl p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-vital-dim border-2 border-vital flex items-center justify-center text-2xl font-black text-text">
              <Building2 className="h-8 w-8 text-vital" />
            </div>
            <div>
              <h1 className="text-xl font-black text-text">Hospital Profile</h1>
              <p className="text-xs text-text-2">Manage your hospital identity and contact details</p>
            </div>
          </header>

          <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-bold text-text flex items-center gap-2 border-b border-border pb-3">
              <Building2 className="h-4 w-4 text-vital" /> Hospital Information
            </h2>
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Hospital Name</label>
              <input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-3">Hospital Type</label>
              <div className="grid grid-cols-3 gap-2">
                {HOSPITAL_TYPES.map((t) => (
                  <button key={t} onClick={() => setType(t)}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-all ${type === t ? "bg-vital text-text" : "bg-surface-2 border border-border text-text-3 hover:text-text"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-bold text-text flex items-center gap-2 border-b border-border pb-3">
              <MapPin className="h-4 w-4 text-vital" /> Contact & Location
            </h2>
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-2 uppercase mb-1">City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3" />
              </div>
            </div>
          </section>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 bg-vital hover:brightness-90 text-text rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
        </div>
      </main>
    </ProtectedRoute>
  );
}
