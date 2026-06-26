"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ToastContext";
import { 
  AlertTriangle, Heart, ShieldAlert, MapPin, 
  Upload, Smartphone, ArrowRight, Eye, CheckCircle2 
} from "lucide-react";

// Dynamically import Leaflet Map to prevent Next.js SSR issues
const LocationPickerMap = dynamic(
  () => import("../../components/LocationPickerMap"),
  { ssr: false, loading: () => <div className="h-64 bg-zinc-900 animate-pulse rounded-xl border border-zinc-800 flex items-center justify-center text-zinc-500">Loading Map...</div> }
);

export default function EmergencyRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  // Form State
  const [requesterType, setRequesterType] = useState("Patient Family"); // Hospital, Patient Family, Clinic, Blood Bank
  const [patientName, setPatientName] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [units, setUnits] = useState(2);
  const [urgencyLevel, setUrgencyLevel] = useState("URGENT"); // CRITICAL, URGENT, PLANNED
  const [hospitalName, setHospitalName] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [notes, setNotes] = useState("");
  
  // Document Upload State
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // OTP Verification
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Matching Donors Counter State
  const [matchedDonorsCount, setMatchedDonorsCount] = useState<number | null>(null);

  // Query matching algorithm on changes
  useEffect(() => {
    if (bloodGroup && lat && lng) {
      const getMatchingDonors = async () => {
        try {
          const res = await fetch("http://localhost:5000/api/emergency/match", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              blood_group: bloodGroup,
              lat,
              lng,
              urgency_level: urgencyLevel
            })
          });
          if (res.ok) {
            const data = await res.json();
            setMatchedDonorsCount(data.totalMatched);
          }
        } catch (err) {
          console.error("Match fetch failed:", err);
        }
      };
      
      const debounceTimer = setTimeout(getMatchingDonors, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [bloodGroup, lat, lng, urgencyLevel]);

  // Handle Document Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setDocFile(file);
    setUploading(true);

    try {
      // Call mock api /api/upload
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setDocUrl(data.url);
      toast.push({ title: "Document Uploaded", description: "Verification slip successfully processed", type: "success", id: "upload-ok" });
    } catch (e) {
      console.error(e);
      toast.push({ title: "Upload Failed", description: "Could not upload document", type: "error", id: "upload-err" });
    } finally {
      setUploading(false);
    }
  };

  // Send OTP
  const sendOTP = async () => {
    if (!contactPhone || contactPhone.length < 10) {
      toast.push({ title: "Error", description: "Please enter a valid 10-digit phone number", type: "error", id: "contact-phone-err" });
      return;
    }
    try {
      const res = await fetch("http://localhost:5000/auth/v1/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: contactPhone })
      });
      if (res.ok) {
        setOtpSent(true);
        toast.push({ title: "OTP Sent", description: "Verification code sent. Use 123456", type: "success", id: "req-otp-sent" });
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    if (otpCode === "123456") {
      setPhoneVerified(true);
      toast.push({ title: "Verified", description: "Contact number verified", type: "success", id: "req-otp-ok" });
    } else {
      toast.push({ title: "Error", description: "Invalid verification code", type: "error", id: "req-otp-wrong" });
    }
  };

  // Submit Emergency Request
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bloodGroup) {
      toast.push({ title: "Error", description: "Please select a blood type", type: "error", id: "select-blood-err" });
      return;
    }
    if (!phoneVerified) {
      toast.push({ title: "Error", description: "Phone number OTP verification is mandatory", type: "error", id: "otp-required-err" });
      return;
    }

    try {
      const expiresAt = new Date();
      if (urgencyLevel === "CRITICAL") expiresAt.setHours(expiresAt.getHours() + 2);
      else if (urgencyLevel === "URGENT") expiresAt.setHours(expiresAt.getHours() + 24);
      else expiresAt.setDate(expiresAt.getDate() + 3);

      const requestPayload = {
        requester_id: user?.id || null, // Allow anonymous or logged-in emergency submissions
        requester_type: requesterType,
        patient_name: patientName || "Anonymized Patient",
        blood_group_needed: bloodGroup,
        units_needed: Number(units),
        urgency_level: urgencyLevel,
        hospital_name: hospitalName,
        address,
        lat,
        lng,
        contact_name: contactName,
        contact_phone: contactPhone,
        status: "pending",
        verification_doc_url: docUrl || null,
        is_verified: requesterType === "Hospital" && docUrl ? true : false,
        expires_at: expiresAt.toISOString()
      };

      const { data, error } = await supabase
        .from("blood_requests")
        .insert([requestPayload])
        .select()
        .single();

      if (error) throw error;

      // Trigger automatic matching & donor alerting in mock backend
      try {
        await fetch("http://localhost:5000/api/emergency/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blood_group: bloodGroup,
            lat,
            lng,
            urgency_level: urgencyLevel
          })
        });
      } catch (matchErr) {
        console.warn("Algorithmic matching error:", matchErr);
      }

      toast.push({ title: "Emergency Broadcasted", description: "We are alerting nearby donors right now!", type: "success", id: "broadcast-ok" });
      
      // Redirect to the status tracking page!
      router.push(`/emergency/status/${data.id}`);

    } catch (err: any) {
      console.error(err);
      toast.push({ title: "Error", description: err.message || "Failed to submit request", type: "error", id: "request-submit-err" });
    }
  };

  return (
    <div className="bg-[#0A0A0A] min-h-screen pb-16">
      {/* Top Red Urgency Banner */}
      <div className="bg-[#C41E3A] text-white py-3.5 px-4 shadow-[0_4px_20px_rgba(196,30,58,0.3)] animate-pulse">
        <div className="max-w-4xl mx-auto flex items-center justify-center gap-2">
          <AlertTriangle className="h-5 w-5 text-white flex-shrink-0" />
          <span className="font-extrabold text-sm uppercase tracking-widest text-center">
            EMERGENCY REQUEST — We will contact donors immediately
          </span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 mt-8">
        <form onSubmit={handleSubmitRequest} className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
          
          <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
            <ShieldAlert className="h-6 w-6 text-[#C41E3A]" />
            <div>
              <h2 className="text-xl font-bold text-[#F5F5F5]">Emergency Broadcast Form</h2>
              <p className="text-xs text-[#9090A0]">Submit details to initiate immediate donor response matching</p>
            </div>
          </div>

          {/* Requester Type */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {['Patient Family', 'Hospital', 'Clinic', 'Blood Bank'].map(type => (
              <button
                type="button"
                key={type}
                onClick={() => setRequesterType(type)}
                className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                  requesterType === type 
                    ? 'border-[#C41E3A] bg-red-950/20 text-[#C41E3A]' 
                    : 'border-zinc-800 bg-[#0F0F0F] text-[#9090A0] hover:border-zinc-700'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9090A0] uppercase mb-1">Patient Name (Optional)</label>
              <input 
                type="text" 
                placeholder="Anonymized if empty" 
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className="w-full bg-[#0F0F0F] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9090A0] uppercase mb-1">Urgency Level</label>
              <select
                value={urgencyLevel}
                onChange={(e) => setUrgencyLevel(e.target.value)}
                className="w-full bg-[#0F0F0F] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
              >
                <option value="CRITICAL">CRITICAL (Surgery in &lt; 2 hours)</option>
                <option value="URGENT">URGENT (Needed today)</option>
                <option value="PLANNED">PLANNED (Within 3 days)</option>
              </select>
            </div>
          </div>

          {/* Blood group grid selection */}
          <div>
            <label className="block text-xs font-semibold text-[#9090A0] uppercase mb-3">Blood Type Needed</label>
            <div className="grid grid-cols-4 gap-3">
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => (
                <button
                  type="button"
                  key={bg}
                  onClick={() => setBloodGroup(bg)}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    bloodGroup === bg 
                      ? 'border-[#C41E3A] bg-red-950/20 text-[#C41E3A] shadow-[0_0_12px_rgba(196,30,58,0.2)]' 
                      : 'border-zinc-800 bg-[#0F0F0F] text-[#9090A0] hover:border-zinc-700'
                  }`}
                >
                  <span className="font-extrabold text-sm">{bg}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Units Required Slider */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-[#9090A0] uppercase mb-1">
              <span>Units Needed</span>
              <span className="text-[#C41E3A] font-bold text-sm">{units} Bags ({units * 350} ml)</span>
            </div>
            <input 
              type="range" 
              min={1} 
              max={10} 
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="w-full accent-[#C41E3A] bg-zinc-800 h-1.5 rounded-lg"
            />
          </div>

          {/* Location Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#9090A0] uppercase mb-1">Hospital / Clinic Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Fortis Hospital" 
                value={hospitalName}
                onChange={(e) => setHospitalName(e.target.value)}
                className="w-full bg-[#0F0F0F] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#9090A0] uppercase mb-1">Hospital Full Address</label>
              <input 
                type="text" 
                required
                placeholder="Locality, City, Landmark" 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#0F0F0F] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
              />
            </div>
          </div>

          {/* Map Selector */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-semibold text-[#9090A0] uppercase">
              <span>Drop pin on Hospital Location</span>
            </div>
            <LocationPickerMap lat={lat} lng={lng} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
          </div>

          {/* Verification documents upload */}
          <div className="bg-[#0F0F0F] border border-zinc-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-[#9090A0] uppercase">Verification Document</h4>
            <p className="text-[11px] text-[#9090A0]">
              {requesterType === 'Hospital' 
                ? 'Please upload official Hospital letterhead document indicating blood request details.' 
                : 'Please upload Patient admission slip / doctor prescription slip to verify request.'}
            </p>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[#F5F5F5] text-xs font-bold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-all">
                <Upload className="h-4 w-4 text-[#C41E3A]" /> 
                <span>{uploading ? "Uploading..." : "Select Image"}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
              {docUrl && (
                <span className="text-emerald-400 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" /> Ready to Verify
                </span>
              )}
            </div>
          </div>

          {/* Contact Details & Verification */}
          <div className="border-t border-zinc-800 pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#9090A0] uppercase mb-1">Contact Person Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Full Name" 
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-[#0F0F0F] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9090A0] uppercase mb-1">Contact Phone (OTP Required)</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    required
                    disabled={phoneVerified}
                    placeholder="10-digit number" 
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, ""))}
                    className="flex-1 bg-[#0F0F0F] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#C41E3A] disabled:opacity-50"
                  />
                  {!phoneVerified ? (
                    <button 
                      type="button" 
                      onClick={sendOTP}
                      className="px-3 bg-red-950/40 border border-[#C41E3A]/40 text-[#C41E3A] hover:bg-[#C41E3A] hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <Smartphone className="h-3.5 w-3.5" /> Send OTP
                    </button>
                  ) : (
                    <span className="px-3 bg-emerald-950/30 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {otpSent && !phoneVerified && (
              <div className="bg-[#0F0F0F] p-4 rounded-xl border border-zinc-800 space-y-2">
                <p className="text-xs text-[#9090A0]">Enter 6-digit OTP verification code:</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Enter code (123456)" 
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white"
                  />
                  <button 
                    type="button" 
                    onClick={verifyOTP}
                    className="bg-[#C41E3A] hover:bg-[#8B0000] text-white px-4 rounded-lg text-xs font-bold"
                  >
                    Verify Code
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[#9090A0] uppercase mb-1">Additional Notes / Requirements</label>
            <textarea 
              rows={3}
              placeholder="Provide extra details (e.g. patient blood group constraints, specific ward or ICU room number)" 
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#0F0F0F] border border-zinc-800 rounded-xl px-4 py-3 text-sm text-[#F5F5F5] focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
            />
          </div>

          {/* Live match estimate alert */}
          {matchedDonorsCount !== null && (
            <div className="bg-red-950/20 border border-[#C41E3A]/40 rounded-xl p-4 text-center">
              <span className="text-[#C41E3A] font-extrabold text-sm animate-pulse">
                ❤️ Found {matchedDonorsCount} active, eligible {bloodGroup || "matching"} donors in broadcasting range.
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-4 border-t border-zinc-800 flex justify-end">
            <button
              type="submit"
              disabled={!bloodGroup || !hospitalName || !address || !contactName || !phoneVerified}
              className="w-full sm:w-auto px-8 py-3.5 bg-[#C41E3A] hover:bg-[#8B0000] text-white font-bold rounded-lg text-sm transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              Broadcast Emergency Request <ArrowRight className="h-4 w-4" />
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
