"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "../../../../components/ProtectedRoute";
import { useAuth } from "../../../../context/AuthContext";
import { supabase } from "../../../../lib/supabaseClient";
import { useToast } from "../../../../components/ToastContext";
import { Heart, MapPin, Phone, Droplets, Save, Loader2 } from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export default function DonorProfilePage() {
  const { user } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [donor, setDonor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [weight, setWeight] = useState("");
  const [maxTravel, setMaxTravel] = useState(10);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      const { data: d } = await supabase.from("donors").select("*").eq("id", user.id).single();
      if (p) {
        setProfile(p);
        setFullName(p.full_name || "");
        setCity(p.city || "");
        setPhone(p.phone || "");
      }
      if (d) {
        setDonor(d);
        setBloodGroup(d.blood_group || "");
        setWeight(d.weight_kg?.toString() || "");
        setMaxTravel(d.max_travel_km || 10);
        setIsAvailable(d.is_available ?? true);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from("profiles").update({ full_name: fullName, city, phone }).eq("id", user?.id);
      await supabase.from("donors").update({ blood_group: bloodGroup, weight_kg: parseInt(weight), max_travel_km: maxTravel, is_available: isAvailable }).eq("id", user?.id);
      toast.push({ title: "Profile saved", description: "Your changes have been updated.", type: "success", id: "profile-saved" });
    } catch {
      toast.push({ title: "Error", description: "Failed to save profile.", type: "error", id: "profile-err" });
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
    <ProtectedRoute role="donor">
      <main className="min-h-screen bg-void text-text pb-16 px-4">
        <div className="max-w-2xl mx-auto space-y-8 pt-8">
          <header className="bg-surface border border-border rounded-2xl p-6 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-vital-dim border-2 border-vital flex items-center justify-center text-2xl font-black text-text">
              {fullName?.charAt(0) || "?"}
            </div>
            <div>
              <h1 className="text-xl font-black text-text">Your Profile</h1>
              <p className="text-xs text-text-2">Manage your personal and medical details</p>
            </div>
          </header>

          <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-bold text-text flex items-center gap-2 border-b border-border pb-3">
              <Heart className="h-4 w-4 text-vital" /> Personal Information
            </h2>
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
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

          <section className="bg-surface border border-border rounded-2xl p-6 space-y-6">
            <h2 className="text-sm font-bold text-text flex items-center gap-2 border-b border-border pb-3">
              <Droplets className="h-4 w-4 text-vital" /> Medical Profile
            </h2>
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-3">Blood Group</label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_GROUPS.map((bg) => (
                  <button key={bg} onClick={() => setBloodGroup(bg)}
                    className={`py-3 rounded-xl text-lg font-display font-bold transition-all ${bloodGroup === bg ? "bg-vital text-text shadow-vital-glow" : "bg-surface-2 border border-border text-text-3 hover:border-vital"}`}>
                    {bg}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Weight (kg)</label>
              <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-2">
                Max Travel: <span className="text-vital">{maxTravel} km</span>
              </label>
              <input type="range" min={2} max={50} value={maxTravel} onChange={(e) => setMaxTravel(parseInt(e.target.value))}
                className="w-full accent-vital bg-surface-2 h-1.5 rounded-lg appearance-none cursor-pointer" />
            </div>
            <div className="flex items-center justify-between bg-surface-2 p-4 rounded-xl border border-border">
              <div>
                <p className="text-sm font-semibold text-text">Available to donate</p>
                <p className="text-xs text-text-3">Toggle off if unavailable</p>
              </div>
              <button onClick={() => setIsAvailable(!isAvailable)}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors ${isAvailable ? "bg-confirmed" : "bg-surface-2 border border-border"}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isAvailable ? "translate-x-6" : "translate-x-0"}`} />
              </button>
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
