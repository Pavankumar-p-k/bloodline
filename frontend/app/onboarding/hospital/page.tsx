"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { Building2, MapPin, FileCheck, Droplets, ChevronLeft, Loader2 } from "lucide-react";

const HOSPITAL_TYPES = ["Government", "Private", "Trust", "NGO", "Clinic"];
const INVENTORY_DEFAULTS: Record<string, string> = {
  "A+": "0", "A-": "0", "B+": "0", "B-": "0",
  "O+": "0", "O-": "0", "AB+": "0", "AB-": "0",
};
const MAX_STEPS = 4;

export default function HospitalOnboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [hospitalName, setHospitalName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [type, setType] = useState("");

  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [phone, setPhone] = useState("");

  const [regCert, setRegCert] = useState<{ name: string; size: number } | null>(null);

  const [inventory, setInventory] = useState<Record<string, string>>({ ...INVENTORY_DEFAULTS });

  const handleCertUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setRegCert({ name: file.name, size: file.size });
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await supabase.from("profiles").update({
        full_name: hospitalName,
        city: city,
        phone: phone,
      }).eq("id", user.id);

      await supabase.from("hospital_profiles").insert({
        id: user.id,
        hospital_name: hospitalName,
        registration_number: regNumber,
        hospital_type: type,
        address: `${address}, ${city}, ${state} - ${pincode}`,
        phone: phone,
        verification_tier: "unverified",
      });

      const inventoryEntries = Object.entries(inventory)
        .filter(([, qty]) => parseInt(qty) > 0)
        .map(([bg, qty]) => ({
          hospital_id: user.id,
          blood_group: bg,
          units_available: parseInt(qty),
          status: "available" as const,
        }));

      if (inventoryEntries.length > 0) {
        await supabase.from("blood_inventory").insert(inventoryEntries);
      }

      router.push("/hospital/dashboard");
    } catch (err) {
      console.error("Hospital onboarding failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const stepValid = () => {
    switch (step) {
      case 1: return hospitalName && regNumber && type;
      case 2: return address && city && state && pincode && phone;
      case 3: return regCert !== null;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <main className="min-h-screen bg-void py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Progress step indicators */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step >= s ? "bg-vital text-white" : "bg-surface-2 border border-border text-text-3"}`}>
                {s < step ? "✓" : s}
              </div>
              {s < 4 && <div className={`h-0.5 w-10 sm:w-16 transition-colors ${step > s ? "bg-vital" : "bg-surface-2"}`} />}
            </React.Fragment>
          ))}
        </div>

        {step > 1 && !loading && (
          <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 text-xs text-text-3 hover:text-text-2 mb-6 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}

        {step === 1 && (
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-up">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-vital" />
              <h2 className="text-lg font-bold text-text">Step 1 — Hospital Identity</h2>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Hospital Name</label>
              <input value={hospitalName} onChange={(e) => setHospitalName(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3"
                placeholder="e.g. AIIMS Delhi" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Registration Number</label>
              <input value={regNumber} onChange={(e) => setRegNumber(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3"
                placeholder="e.g. HR-NHFW-2024-0001" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-3">Hospital Type</label>
              <div className="grid grid-cols-3 gap-2">
                {HOSPITAL_TYPES.map((t) => (
                  <button key={t} onClick={() => setType(t)}
                    className={`py-2.5 rounded-lg text-xs font-bold transition-all ${type === t ? "bg-vital text-white" : "bg-surface-2 border border-border text-text-3 hover:text-text"}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => setStep(2)} disabled={!stepValid()}
              className="w-full py-3 bg-vital hover:brightness-90 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50">
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-up">
            <div className="flex items-center gap-3">
              <MapPin className="h-6 w-6 text-vital" />
              <h2 className="text-lg font-bold text-text">Step 2 — Contact & Location</h2>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Street Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3"
                placeholder="e.g. Sri Aurobindo Marg" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-2 uppercase mb-1">City</label>
                <input value={city} onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3"
                  placeholder="e.g. Delhi" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-2 uppercase mb-1">State</label>
                <input value={state} onChange={(e) => setState(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3"
                  placeholder="e.g. Delhi" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Pincode</label>
                <input value={pincode} onChange={(e) => setPincode(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3"
                  placeholder="110001" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Phone</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3"
                  placeholder="+91-XXXXXXXXXX" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3 border border-border text-text-3 hover:text-text rounded-lg text-sm font-semibold transition-all">
                Back
              </button>
              <button onClick={() => setStep(3)} disabled={!stepValid()}
                className="flex-1 py-3 bg-vital hover:brightness-90 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-up">
            <div className="flex items-center gap-3">
              <FileCheck className="h-6 w-6 text-vital" />
              <h2 className="text-lg font-bold text-text">Step 3 — Verification</h2>
            </div>
            <p className="text-xs text-text-3 leading-relaxed">
              Upload your hospital&apos;s registration certificate to verify your identity.
              This is reviewed within 24 hours.
            </p>
            <label className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${regCert ? "border-vital bg-vital/5" : "border-border hover:border-vital"}`}>
              <FileCheck className={`mx-auto h-10 w-10 mb-3 ${regCert ? "text-vital" : "text-text-3"}`} />
              <p className="text-xs font-semibold text-text-2 mb-1">
                {regCert ? regCert.name : "Upload Registration Certificate (PDF/JPG)"}
              </p>
              {regCert && <p className="text-[11px] text-text-3">{(regCert.size / 1024).toFixed(1)} KB</p>}
              <input type="file" accept=".pdf,image/*" onChange={handleCertUpload} className="hidden" />
            </label>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 py-3 border border-border text-text-3 hover:text-text rounded-lg text-sm font-semibold transition-all">
                Back
              </button>
              <button onClick={() => setStep(4)} disabled={!stepValid()}
                className="flex-1 py-3 bg-vital hover:brightness-90 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-up">
            <div className="flex items-center gap-3">
              <Droplets className="h-6 w-6 text-vital" />
              <h2 className="text-lg font-bold text-text">Step 4 — Initial Blood Inventory</h2>
            </div>
            <p className="text-xs text-text-3">Set your current stock levels. You can update these anytime.</p>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(INVENTORY_DEFAULTS).map((bg) => (
                <div key={bg} className="flex items-center gap-2 bg-surface-2 p-2 rounded-xl border border-border">
                  <span className="w-10 text-center font-display font-bold text-sm text-text">{bg}</span>
                  <input type="number" min={0} value={inventory[bg]} onChange={(e) => setInventory({ ...inventory, [bg]: e.target.value })}
                    className="flex-1 bg-void border border-border rounded-lg px-2 py-2 text-center text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="0" />
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)}
                className="flex-1 py-3 border border-border text-text-3 hover:text-text rounded-lg text-sm font-semibold transition-all">
                Back
              </button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-3 bg-vital hover:brightness-90 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Setup"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
