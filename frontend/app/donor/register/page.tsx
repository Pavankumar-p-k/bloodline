"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { useToast } from "../../../components/ToastContext";
import { 
  Heart, ShieldCheck, MapPin, CheckCircle2, 
  Sparkles, Smartphone, Download, Share2, 
  AlertOctagon, CheckSquare 
} from "lucide-react";

// Dynamically import Leaflet Map to prevent Next.js SSR issues
const LocationPickerMap = dynamic(
  () => import("../../../components/LocationPickerMap"),
  { ssr: false, loading: () => <div className="h-64 bg-surface animate-pulse rounded-xl border border-border flex items-center justify-center text-text-3">Loading Map...</div> }
);

export default function DonorRegisterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  // Step 1: Personal
  const [fullName, setFullName] = useState("");
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  
  // OTP states
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Step 2: Medical
  const [bloodGroup, setBloodGroup] = useState("");
  const [lastDonationDate, setLastDonationDate] = useState("");
  const [weight, setWeight] = useState<number | "">("");
  const [hasMeds, setHasMeds] = useState(false);
  const [conditions, setConditions] = useState({
    diabetes: false,
    hiv: false,
    hepatitis: false
  });

  // Step 3: Location & Availability
  const [city, setCity] = useState("Bangalore");
  const [area, setArea] = useState("");
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);
  const [availability, setAvailability] = useState("available_now"); // available_now, unavailable, available_after
  const [availableAfterDate, setAvailableAfterDate] = useState("");
  const [notifPreference, setNotifPreference] = useState("all"); // sms, whatsapp, in_app, all
  const [maxTravelKm, setMaxTravelKm] = useState(10);

  // Completed ID State
  const [registeredDonor, setRegisteredDonor] = useState<any | null>(null);

  // Auto-disqualification logic
  const isDisqualified = () => {
    if (age !== "" && (age < 18 || age > 65)) return "Age must be between 18 and 65 years.";
    if (weight !== "" && weight <= 50) return "Weight must be greater than 50 kg.";
    if (conditions.diabetes || conditions.hiv || conditions.hepatitis) {
      return "Individuals with chronic conditions (Diabetes, HIV, Hepatitis) are ineligible to donate blood.";
    }
    return null;
  };

  const activeError = isDisqualified();

  // Handle Send OTP
  const sendOTP = async () => {
    if (!phone || phone.length < 10) {
      toast.push({ title: "Error", description: "Please enter a valid 10-digit phone number", type: "error", id: "reg-phone-err" });
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/auth/v1/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      if (res.ok) {
        setOtpSent(true);
        toast.push({ title: "OTP Sent", description: "Use code 123456 to verify", type: "success", id: "otp-sent" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Verify OTP
  const verifyOTP = async () => {
    if (otpCode === "123456") {
      setPhoneVerified(true);
      toast.push({ title: "Verified", description: "Phone number verified successfully", type: "success", id: "otp-ok" });
    } else {
      toast.push({ title: "Error", description: "Invalid verification code", type: "error", id: "otp-wrong" });
    }
  };

  // Handle Geolocation auto-detection
  const handleGPSDetect = () => {
    if (!navigator.geolocation) {
      toast.push({ title: "Unsupported", description: "Geolocation is not supported by your browser", type: "error", id: "geo-unsupported" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        toast.push({ title: "Success", description: "Location detected successfully!", type: "success", id: "geo-success" });
      },
      (err) => {
        console.error(err);
        toast.push({ title: "Location Error", description: "Could not auto-detect location. Please select on map.", type: "error", id: "geo-err" });
      }
    );
  };

  // Submit Donor Form
  const handleSubmitForm = async () => {
    if (!user) {
      toast.push({ title: "Error", description: "You must be signed in to register", type: "error", id: "not-signed-in" });
      return;
    }
    
    setLoading(true);
    try {
      const payload = {
        id: user.id,
        full_name: fullName,
        age: Number(age),
        gender,
        phone,
        blood_group: bloodGroup,
        city,
        area,
        lat,
        lng,
        last_donation_date: lastDonationDate || null,
        is_available: availability === "available_now",
        available_after: availability === "available_after" ? new Date(availableAfterDate).toISOString() : null,
        max_travel_km: maxTravelKm,
        is_verified: true
      };

      const { data, error } = await supabase
        .from("donors")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Update profile info
      await supabase.from("profiles").update({ name: fullName, phone, city }).eq("id", user.id);

      setRegisteredDonor(data);
      setStep(4); // Move to confirmation
      toast.push({ title: "Registered!", description: "Thank you for joining. You are now saving lives!", type: "success", id: "reg-complete" });
    } catch (e: any) {
      console.error(e);
      toast.push({ title: "Registration Error", description: e.message || "Failed to register donor profile", type: "error", id: "reg-api-err" });
    } finally {
      setLoading(false);
    }
  };

  // Canvas Image Downloader
  const downloadDonorCard = () => {
    if (!registeredDonor) return;
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Background Gradient (Dark Red to Black Surface)
    const grad = ctx.createLinearGradient(0, 0, 600, 350);
    grad.addColorStop(0, "#8B0000");
    grad.addColorStop(0.5, "#1A1A1A");
    grad.addColorStop(1, "#060608");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 350);

    // Glowing Crimson Border
    ctx.strokeStyle = "#C41E3A";
    ctx.lineWidth = 4;
    ctx.strokeRect(12, 12, 576, 326);

    // Header Text
    ctx.fillStyle = "#C41E3A";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText("BLOODLINE DONOR ID", 40, 65);

    ctx.fillStyle = "#9090A0";
    ctx.font = "13px sans-serif";
    ctx.fillText("EMERGENCY RESPONSE NETWORK - INDIA", 40, 90);

    // Details Label & Values
    ctx.fillStyle = "#9090A0";
    ctx.font = "14px sans-serif";
    ctx.fillText("DONOR NAME", 40, 140);
    ctx.fillText("BLOOD GROUP", 40, 200);
    ctx.fillText("CITY / AREA", 40, 260);
    ctx.fillText("DONOR SERIAL", 300, 140);
    ctx.fillText("STATUS", 300, 200);

    ctx.fillStyle = "#F5F5F5";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(registeredDonor.full_name, 40, 165);
    
    ctx.fillStyle = "#C41E3A";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(registeredDonor.blood_group, 40, 230);
    
    ctx.fillStyle = "#F5F5F5";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(`${registeredDonor.city}, ${registeredDonor.area || "General"}`, 40, 285);

    ctx.fillStyle = "#E0E0E0";
    ctx.font = "bold 15px monospace";
    ctx.fillText(registeredDonor.id.substring(0, 18).toUpperCase(), 300, 165);

    ctx.fillStyle = "#22C55E";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("VERIFIED DONOR", 300, 225);

    // Watermark Blood Drop Icon
    ctx.fillStyle = "#C41E3A";
    ctx.font = "bold 110px sans-serif";
    ctx.fillText("ðŸ©¸", 460, 210);

    // Footer saving lives slogan
    ctx.fillStyle = "#F5F5F5";
    ctx.font = "italic 14px sans-serif";
    ctx.fillText("YOUR BLOOD. SOMEONE'S TOMORROW.", 300, 285);

    // Download action
    const link = document.createElement("a");
    link.download = `bloodline_donor_card_${registeredDonor.full_name.replace(/\s+/g, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // WhatsApp Share Helper
  const shareWhatsApp = () => {
    if (!registeredDonor) return;
    const text = encodeURIComponent(
      `ðŸ”´ I just registered as a verified Blood Donor on Bloodline! â¤ï¸\nBlood Group: ${registeredDonor.blood_group}\nCity: ${registeredDonor.city}\nJoin me in saving lives today. Sign up at: http://localhost:3000`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      {/* Page Title */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-extrabold text-text">Donor Registration</h1>
        <p className="text-sm text-text-2 mt-2">Become a lifesaver in under 3 minutes</p>
      </div>

      {/* Progress Bar (Visible only during input steps) */}
      {step <= 3 && (
        <div className="mb-8">
          <div className="flex items-center justify-between text-xs font-semibold text-text-2 mb-2 uppercase tracking-widest">
            <span className={step >= 1 ? "text-vital" : ""}>1. Personal</span>
            <span className={step >= 2 ? "text-vital" : ""}>2. Medical</span>
            <span className={step >= 3 ? "text-vital" : ""}>3. Location</span>
          </div>
          <div className="w-full bg-surface-2 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-vital h-full transition-all duration-300 shadow-vital-glow" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Disqualification Banner */}
      {step <= 2 && activeError && (
        <div className="mb-6 p-4 rounded-xl border border-vital-mid bg-vital-dim text-vital flex items-start gap-3">
          <AlertOctagon className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-semibold text-sm">Eligibility Disqualification</h4>
            <p className="text-xs mt-0.5 leading-relaxed">{activeError}</p>
          </div>
        </div>
      )}

      {/* STEP 1: Personal Info */}
      {step === 1 && (
        <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <ShieldCheck className="h-6 w-6 text-vital" />
            <h3 className="text-lg font-bold text-text">Step 1 â€” Personal Details</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Full Name</label>
              <input 
                type="text" 
                placeholder="Enter your full name" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Age (18-65)</label>
              <input 
                type="number" 
                placeholder="Age" 
                value={age}
                onChange={(e) => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Gender</label>
              <select 
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Aadhar Last 4 Digits</label>
              <input 
                type="text" 
                maxLength={4}
                placeholder="xxxx" 
                value={aadhar}
                onChange={(e) => setAadhar(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital"
              />
            </div>
          </div>

          {/* OTP phone verification section */}
          <div className="border-t border-border pt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Phone Number (OTP Verification Required)</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  disabled={phoneVerified}
                  placeholder="Enter 10-digit number" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital disabled:opacity-55"
                />
                {!phoneVerified ? (
                  <button 
                    type="button"
                    onClick={sendOTP}
                    className="px-4 bg-vital-dim border border-vital/40 text-vital hover:bg-vital hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <Smartphone className="h-4 w-4" /> Send OTP
                  </button>
                ) : (
                  <span className="px-4 bg-confirmed/5 text-confirmed border border-confirmed/20 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Verified
                  </span>
                )}
              </div>
            </div>

            {otpSent && !phoneVerified && (
              <div className="bg-surface-2 p-4 rounded-xl border border-border space-y-2">
                <p className="text-xs text-text-2">Enter verification OTP code:</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter code" 
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="flex-1 bg-void border border-border rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <button 
                    type="button"
                    onClick={verifyOTP}
                    className="bg-vital hover:bg-vital text-white px-4 rounded-lg text-xs font-bold"
                  >
                    Verify Code
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button
              onClick={() => setStep(2)}
              disabled={!fullName || !age || !gender || !phoneVerified || activeError !== null}
              className="px-6 py-3 bg-vital hover:bg-vital text-white rounded-lg text-sm font-bold disabled:opacity-40 transition-all flex items-center gap-1"
            >
              Continue to Medical Info
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Medical Info */}
      {step === 2 && (
        <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <Heart className="h-6 w-6 text-vital" />
            <h3 className="text-lg font-bold text-text">Step 2 â€” Medical Information</h3>
          </div>

          {/* Blood group visual selector */}
          <div>
            <label className="block text-xs font-semibold text-text-2 uppercase mb-3">Select Blood Group</label>
            <div className="grid grid-cols-4 gap-3">
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                <button
                  type="button"
                  key={bg}
                  onClick={() => setBloodGroup(bg)}
                  className={`relative p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    bloodGroup === bg 
                      ? 'border-vital bg-vital-dim text-vital shadow-[0_0_12px_rgba(196,30,58,0.2)]' 
                      : 'border-border bg-surface-2 text-text-2 hover:border-border-2'
                  }`}
                >
                  <span className="text-2xl mb-1">ðŸ©¸</span>
                  <span className="font-extrabold text-sm">{bg}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Weight (kg)</label>
              <input 
                type="number" 
                placeholder="e.g. 62" 
                value={weight}
                onChange={(e) => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Last Donation Date (Optional)</label>
              <input 
                type="date" 
                value={lastDonationDate}
                onChange={(e) => setLastDonationDate(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital"
              />
            </div>
          </div>

          {/* Current medications toggle */}
          <div className="flex items-center justify-between bg-surface-2 p-4 rounded-xl border border-border">
            <div>
              <h4 className="text-sm font-semibold text-text">Current Medications</h4>
              <p className="text-xs text-text-2 mt-0.5">Are you currently taking any prescription drugs?</p>
            </div>
            <button
              type="button"
              onClick={() => setHasMeds(!hasMeds)}
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${hasMeds ? 'bg-vital' : 'bg-zinc-700'}`}
            >
              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-200 ${hasMeds ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Medical conditions checklist */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-text-2 uppercase">Medical Checklist (Chronic Diseases)</label>
            <div className="space-y-2 bg-surface-2 p-4 rounded-xl border border-border">
              <label className="flex items-center gap-3 text-sm text-text-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={conditions.diabetes}
                  onChange={(e) => setConditions({ ...conditions, diabetes: e.target.checked })}
                  className="rounded border-border text-vital focus:ring-vital bg-void" 
                />
                Diabetes
              </label>
              <label className="flex items-center gap-3 text-sm text-text-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={conditions.hiv}
                  onChange={(e) => setConditions({ ...conditions, hiv: e.target.checked })}
                  className="rounded border-border text-vital focus:ring-vital bg-void" 
                />
                HIV / AIDS
              </label>
              <label className="flex items-center gap-3 text-sm text-text-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={conditions.hepatitis}
                  onChange={(e) => setConditions({ ...conditions, hepatitis: e.target.checked })}
                  className="rounded border-border text-vital focus:ring-vital bg-void" 
                />
                Hepatitis (A/B/C)
              </label>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-border">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 border border-border text-text-2 hover:text-white rounded-lg text-sm font-semibold transition-all"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!bloodGroup || !weight || activeError !== null}
              className="px-6 py-3 bg-vital hover:bg-vital text-white rounded-lg text-sm font-bold disabled:opacity-40 transition-all"
            >
              Continue to Location
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Location & Availability */}
      {step === 3 && (
        <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border space-y-6">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            <MapPin className="h-6 w-6 text-vital" />
            <h3 className="text-lg font-bold text-text">Step 3 â€” Location & Preferences</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">City</label>
              <input 
                type="text" 
                placeholder="e.g. Bangalore" 
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Area / Locality</label>
              <input 
                type="text" 
                placeholder="e.g. Indiranagar" 
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital"
              />
            </div>
          </div>

          {/* Leaflet Map selector */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-semibold text-text-2 uppercase">
              <span>Approximate Location Pin Drop</span>
              <button 
                type="button" 
                onClick={handleGPSDetect} 
                className="text-vital hover:underline"
              >
                [Auto-detect GPS]
              </button>
            </div>
            <LocationPickerMap lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
            <p className="text-[11px] text-text-2 italic">Note: Only city/area level coordinates are saved publicly for your privacy protection.</p>
          </div>

          {/* Availability Details */}
          <div>
            <label className="block text-xs font-semibold text-text-2 uppercase mb-2">Availability Status</label>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  name="availability" 
                  id="avail-now" 
                  checked={availability === "available_now"}
                  onChange={() => setAvailability("available_now")}
                  className="text-vital focus:ring-vital bg-void border-border"
                />
                <label htmlFor="avail-now" className="text-sm text-text cursor-pointer">Available Now</label>
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  name="availability" 
                  id="avail-unavail" 
                  checked={availability === "unavailable"}
                  onChange={() => setAvailability("unavailable")}
                  className="text-vital focus:ring-vital bg-void border-border"
                />
                <label htmlFor="avail-unavail" className="text-sm text-text cursor-pointer">Unavailable</label>
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  name="availability" 
                  id="avail-after" 
                  checked={availability === "available_after"}
                  onChange={() => setAvailability("available_after")}
                  className="text-vital focus:ring-vital bg-void border-border"
                />
                <label htmlFor="avail-after" className="text-sm text-text cursor-pointer">Available After date</label>
              </div>
            </div>

            {availability === "available_after" && (
              <div className="mt-2">
                <input 
                  type="date" 
                  value={availableAfterDate}
                  onChange={(e) => setAvailableAfterDate(e.target.value)}
                  className="bg-surface-2 border border-border rounded-xl px-3 py-2 text-sm text-text"
                />
              </div>
            )}
          </div>

          {/* Preferences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Max Travel Distance ({maxTravelKm === 100 ? "Any" : `${maxTravelKm} km`})</label>
              <input 
                type="range" 
                min={2} 
                max={50} 
                step={maxTravelKm > 20 ? 10 : 3} 
                value={maxTravelKm}
                onChange={(e) => setMaxTravelKm(Number(e.target.value))}
                className="w-full accent-vital bg-surface-2"
              />
              <div className="flex justify-between text-[10px] text-text-2 mt-1 font-semibold">
                <span>2km</span>
                <span>5km</span>
                <span>10km</span>
                <span>20km</span>
                <span>50km</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 uppercase mb-1">Notification Channel</label>
              <select 
                value={notifPreference}
                onChange={(e) => setNotifPreference(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:ring-2 focus:ring-vital"
              >
                <option value="all">All Channels</option>
                <option value="sms">SMS Only</option>
                <option value="whatsapp">WhatsApp Only</option>
                <option value="in_app">In-App Notifications</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t border-border">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 border border-border text-text-2 hover:text-white rounded-lg text-sm font-semibold transition-all"
            >
              Back
            </button>
            <button
              onClick={handleSubmitForm}
              disabled={loading || !city || !area}
              className="px-6 py-3 bg-vital hover:bg-vital text-white rounded-lg text-sm font-bold disabled:opacity-40 transition-all flex items-center gap-1.5"
            >
              {loading ? "Registering..." : "Submit Registration"}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Confirmation screen */}
      {step === 4 && registeredDonor && (
        <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border text-center space-y-6 animate-fade-slide">
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-confirmed/10 border border-emerald-500 text-confirmed mb-2">
            <CheckCircle2 className="h-9 w-9" />
          </div>

          <h2 className="text-3xl font-extrabold text-text">You are now saving lives</h2>
          <p className="text-sm text-text-2 max-w-md mx-auto">
            Your donor profile is active and verified. You will receive immediate notifications when a patient or hospital matching your blood type makes an emergency request in your area.
          </p>

          {/* Digital ID Card Preview */}
          <div className="w-full max-w-md mx-auto aspect-[1.71/1] bg-gradient-to-br from-red-950 to-zinc-950 rounded-2xl p-6 border border-vital text-left relative overflow-hidden shadow-[0_0_25px_rgba(196,30,58,0.2)]">
            {/* Chip icon design */}
            <div className="absolute top-6 right-6 font-bold text-3xl opacity-80">ðŸ©¸</div>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-vital text-sm font-extrabold tracking-widest uppercase">Bloodline Donor Card</h4>
                <p className="text-[10px] text-text-2">EMERGENCY RESPONSE NETWORK</p>
              </div>

              <div className="space-y-1 mt-6">
                <p className="text-[10px] text-text-2 uppercase tracking-widest">Name</p>
                <p className="text-text font-bold text-base">{registeredDonor.full_name}</p>
              </div>

              <div className="flex justify-between items-end mt-4">
                <div>
                  <p className="text-[10px] text-text-2 uppercase tracking-widest">Blood Type</p>
                  <p className="text-vital font-extrabold text-2xl leading-none">{registeredDonor.blood_group}</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-2 uppercase tracking-widest text-right">Serial No.</p>
                  <p className="text-text font-mono text-xs text-right uppercase">{registeredDonor.id.substring(0, 15)}...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 max-w-md mx-auto pt-4">
            <button
              onClick={downloadDonorCard}
              className="flex-1 px-4 py-3 bg-vital hover:bg-vital text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Download className="h-4 w-4" /> Download Card
            </button>
            <button
              onClick={shareWhatsApp}
              className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5"
            >
              <Share2 className="h-4 w-4" /> Share on WhatsApp
            </button>
          </div>

          <div className="pt-4 border-t border-border mt-6">
            <button
              onClick={() => router.push("/donor/dashboard")}
              className="text-sm font-bold text-text-2 hover:text-white transition-all underline underline-offset-4"
            >
              Go to my Donor Dashboard
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
