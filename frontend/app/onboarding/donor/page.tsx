"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { Heart, ShieldCheck, ChevronLeft, Loader2 } from "lucide-react";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
const MAX_STEPS = 3;

export default function DonorOnboarding() {
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [disqualified, setDisqualified] = useState(false);

  // Step 1
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  // Step 2
  const [bloodGroup, setBloodGroup] = useState("");
  const [weight, setWeight] = useState("");
  const [lastDonation, setLastDonation] = useState("");
  const [firstTimer, setFirstTimer] = useState(false);
  const [conditions, setConditions] = useState<Record<string, boolean>>({
    diabetes: false,
    recentSurgery: false,
    medications: false,
    hivHepatitis: false,
  });

  // Step 3
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [maxTravel, setMaxTravel] = useState(10);
  const [isAvailable, setIsAvailable] = useState(true);

  const handleConditionChange = (key: string) => {
    setConditions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setPhoto(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const checkDisqualification = () => {
    if (conditions.diabetes || conditions.recentSurgery || conditions.hivHepatitis) {
      setDisqualified(true);
      return true;
    }
    return false;
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const age = dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 0;

      await supabase.from("profiles").update({
        full_name: fullName,
        date_of_birth: dob || null,
        city: city,
      }).eq("id", user.id);

      await supabase.from("donor_profiles").insert({
        id: user.id,
        blood_group: bloodGroup,
        weight_kg: parseInt(weight),
        last_donation: firstTimer ? null : lastDonation || null,
        is_available: isAvailable,
        max_travel_km: maxTravel,
      });

      router.push("/donor/dashboard");
    } catch (err) {
      console.error("Onboarding failed:", err);
    } finally {
      setLoading(false);
    }
  };

  if (disqualified) {
    return (
      <main className="min-h-screen bg-void flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-6 animate-fade-up">
          <span className="text-5xl">🫂</span>
          <h1 className="text-2xl font-display font-bold text-text">Thank you for your honesty</h1>
          <p className="text-sm text-text-2 leading-relaxed">
            For your safety and the recipient&apos;s, we cannot register you at this time.
            Please consult a healthcare professional for guidance.
          </p>
          <div className="bg-surface border border-border rounded-xl p-4 text-left text-xs text-text-2 space-y-1">
            <p className="font-bold text-text mb-1">Health Resources:</p>
            <p>🇮🇳 Indian Red Cross: <span className="text-vital">+91-11-23716441</span></p>
            <p>🩸 National Blood Transfusion Council: <span className="text-vital">+91-11-23061487</span></p>
          </div>
          <button onClick={() => router.push("/")} className="text-sm text-text-3 hover:text-text-2 underline underline-offset-4">
            Return to home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-void py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Progress bar */}
        <div className="w-full bg-surface-2 h-1 rounded-full overflow-hidden mb-8">
          <div
            className="bg-vital h-full transition-all duration-300"
            style={{ width: `${(step / MAX_STEPS) * 100}%` }}
          />
        </div>

        {/* Back button */}
        {step > 1 && !loading && (
          <button onClick={() => setStep(step - 1)} className="flex items-center gap-1 text-xs text-text-3 hover:text-text-2 mb-6 transition-colors">
            <ChevronLeft className="h-3.5 w-3.5" /> Back
          </button>
        )}

        {step === 1 && (
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-up">
            <div className="flex items-center gap-3">
              <Heart className="h-6 w-6 text-vital" />
              <h2 className="text-lg font-bold text-text">Step 1 — Who You Are</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Full Name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3"
                placeholder="Your full name" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Date of Birth</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Gender</label>
                <div className="flex gap-2">
                  {["Male", "Female", "Other"].map((g) => (
                    <button key={g} onClick={() => setGender(g)}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${gender === g ? "bg-vital text-white" : "bg-surface-2 border border-border text-text-3 hover:text-text"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Profile Photo (optional)</label>
              <div className="flex items-center gap-4">
                {photo && <img src={photo} alt="preview" className="w-16 h-16 rounded-full object-cover border-2 border-vital" />}
                <label className="cursor-pointer bg-surface-2 border border-border border-dashed hover:border-vital rounded-xl px-4 py-3 text-xs text-text-3 hover:text-text-2 transition-all">
                  {photo ? "Change photo" : "Upload photo"}
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                </label>
              </div>
            </div>

            <button onClick={() => setStep(2)}
              disabled={!fullName || !gender}
              className="w-full py-3 bg-vital hover:brightness-90 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50">
              Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-up">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-vital" />
              <h2 className="text-lg font-bold text-text">Step 2 — Medical Profile</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-3">Select Blood Group</label>
              <div className="grid grid-cols-4 gap-2">
                {BLOOD_GROUPS.map((bg) => (
                  <button key={bg} onClick={() => setBloodGroup(bg)}
                    className={`py-3 rounded-xl text-lg font-display font-bold transition-all ${bloodGroup === bg ? "bg-vital text-white shadow-vital-glow" : "bg-surface-2 border border-border text-text-3 hover:border-vital"}`}>
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Weight (kg)</label>
              <input type="number" min={50} value={weight} onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3"
                placeholder="Must be at least 50 kg" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Last Donation</label>
              <div className="flex items-center gap-3">
                <input type="date" value={lastDonation} onChange={(e) => setLastDonation(e.target.value)}
                  disabled={firstTimer}
                  className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital disabled:opacity-40" />
                <label className="flex items-center gap-2 text-xs text-text-2 cursor-pointer whitespace-nowrap">
                  <input type="checkbox" checked={firstTimer} onChange={() => setFirstTimer(!firstTimer)}
                    className="accent-vital" />
                  First time
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-2">Any of these apply to you?</label>
              <div className="space-y-2 bg-surface-2 p-4 rounded-xl border border-border">
                {[
                  { key: "diabetes", label: "Diabetes" },
                  { key: "recentSurgery", label: "Recent surgery (within 6 months)" },
                  { key: "medications", label: "Currently on prescription medications" },
                  { key: "hivHepatitis", label: "HIV / Hepatitis history" },
                ].map((c) => (
                  <label key={c.key} className="flex items-center gap-3 text-sm text-text-2 cursor-pointer">
                    <input type="checkbox" checked={conditions[c.key]} onChange={() => handleConditionChange(c.key)}
                      className="rounded border-border text-vital focus:ring-vital bg-surface-2" />
                    {c.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)}
                className="flex-1 py-3 border border-border text-text-3 hover:text-text rounded-lg text-sm font-semibold transition-all">
                Back
              </button>
              <button onClick={() => { if (!checkDisqualification()) setStep(3); }}
                disabled={!bloodGroup || !weight}
                className="flex-1 py-3 bg-vital hover:brightness-90 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50">
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-surface border border-border rounded-2xl p-6 sm:p-8 space-y-6 animate-fade-up">
            <h2 className="text-lg font-bold text-text">Step 3 — Location & Preferences</h2>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3"
                placeholder="e.g. Bangalore" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Area / Locality</label>
              <input value={area} onChange={(e) => setArea(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital placeholder-text-3"
                placeholder="e.g. Indiranagar" />
            </div>

            <p className="text-[11px] text-text-3 italic">
              We only store your neighborhood, not your exact address.
              Your precise location is never shared unless you choose to during a donation.
            </p>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-2">
                Max Travel Distance: <span className="text-vital">{maxTravel} km</span>
              </label>
              <input type="range" min={2} max={50} step={1} value={maxTravel}
                onChange={(e) => setMaxTravel(parseInt(e.target.value))}
                className="w-full accent-vital bg-surface-2 h-1.5 rounded-lg appearance-none cursor-pointer" />
              <div className="flex justify-between text-[10px] text-text-3 mt-1 font-semibold">
                <span>2 km</span><span>10 km</span><span>25 km</span><span>50 km</span>
              </div>
            </div>

            <div className="flex items-center justify-between bg-surface-2 p-4 rounded-xl border border-border">
              <div>
                <p className="text-sm font-semibold text-text">Available to donate</p>
                <p className="text-xs text-text-3">Toggle off if you&apos;re unavailable</p>
              </div>
              <button onClick={() => setIsAvailable(!isAvailable)}
                className={`w-12 h-6 rounded-full p-0.5 transition-colors ${isAvailable ? "bg-confirmed" : "bg-surface-2 border border-border"}`}>
                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${isAvailable ? "translate-x-6" : "translate-x-0"}`} />
              </button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)}
                className="flex-1 py-3 border border-border text-text-3 hover:text-text rounded-lg text-sm font-semibold transition-all">
                Back
              </button>
              <button onClick={handleSubmit}
                disabled={loading || !city}
                className="flex-1 py-3 bg-vital hover:brightness-90 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Complete Registration"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
