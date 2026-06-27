"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { supabase } from "../../../lib/supabaseClient";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../components/ToastContext";
import LiveLocationToggle from "../../../components/LiveLocationToggle";
import { 
  Heart, Calendar, MapPin, ToggleLeft, ToggleRight, 
  Award, Clock, Compass, Activity, Bell, FileText, 
  Download, ArrowRight, ShieldAlert, Sparkles 
} from "lucide-react";

// Haversine distance calculator
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function DonorDashboard() {
  const { user, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();

  // Donor Record details
  const [donorRecord, setDonorRecord] = useState<any | null>(null);
  const [nearbyRequests, setNearbyRequests] = useState<any[]>([]);
  const [donationsHistory, setDonationsHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Notification Preferences Form State
  const [notifSms, setNotifSms] = useState(true);
  const [notifWhatsapp, setNotifWhatsapp] = useState(true);
  const [notifQuietHours, setNotifQuietHours] = useState(false);
  const [notifOverride, setNotifOverride] = useState(true);

  // GPS loading state
  const [updatingLocation, setUpdatingLocation] = useState(false);

  // Fetch all dashboard data
  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      // 1. Fetch donor profile
      const { data: donor, error: dErr } = await supabase
        .from("donors")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (dErr) throw dErr;
      
      // If user signed up but has not completed the details form:
      if (!donor) {
        toast.push({ 
          title: "Registration Incomplete", 
          description: "Redirecting to donor details form to complete registration.", 
          type: "info", 
          id: "redirect-reg" 
        });
        router.push("/donor/register");
        return;
      }
      
      setDonorRecord(donor);

      // 2. Fetch donation history
      const { data: history, error: hErr } = await supabase
        .from("donations")
        .select("*")
        .eq("donor_id", user.id)
        .order("donation_date", { ascending: false });

      if (hErr) throw hErr;
      setDonationsHistory(history || []);

      // 3. Fetch nearby active blood requests
      const { data: requests, error: rErr } = await supabase
        .from("blood_requests")
        .select("*")
        .eq("status", "pending");

      if (rErr) throw rErr;
      
      // Filter based on coordinates (distance <= donor.max_travel_km)
      if (requests) {
        const sorted = requests
          .map((r: any) => {
            const dist = getDistance(donor.lat, donor.lng, r.lat, r.lng);
            return { ...r, distance: dist };
          })
          // Filter within range
          .filter((r: any) => r.distance <= (donor.max_travel_km || 25))
          // Sort by urgency first (CRITICAL -> URGENT -> PLANNED) then distance
          .sort((a: any, b: any) => {
            const urgencyWeight: Record<string, number> = { "CRITICAL": 3, "URGENT": 2, "PLANNED": 1 };
            const weightA = urgencyWeight[a.urgency_level] || 0;
            const weightB = urgencyWeight[b.urgency_level] || 0;
            if (weightB !== weightA) return weightB - weightA;
            return a.distance - b.distance;
          });

        setNearbyRequests(sorted);
      }

    } catch (e: any) {
      console.error(e);
      toast.push({ title: "Fetch Error", description: e.message || "Failed to load dashboard data", type: "error", id: "dash-load-err" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to realtime database requests updates
    const requestsChannel = supabase
      .channel("donor-realtime-broadcast")
      .on("postgres_changes", { event: "*", schema: "public", table: "blood_requests" }, () => {
        fetchDashboardData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "donor_responses" }, () => {
        fetchDashboardData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
    };
  }, [user]);

  // Toggle availability
  const toggleAvailability = async () => {
    if (!donorRecord) return;
    const nextVal = !donorRecord.is_available;
    try {
      const { error } = await supabase
        .from("donors")
        .update({ is_available: nextVal })
        .eq("id", user.id);

      if (error) throw error;
      setDonorRecord({ ...donorRecord, is_available: nextVal });
      toast.push({ 
        title: "Availability Updated", 
        description: nextVal ? "You are now marked as AVAILABLE to save lives." : "You are marked as UNAVAILABLE.", 
        type: "success", 
        id: "avail-toggle-ok" 
      });
    } catch (err: any) {
      toast.push({ title: "Update Failed", description: err.message || "Could not toggle availability", type: "error", id: "avail-err" });
    }
  };

  // Update current coordinates
  const updateCoords = () => {
    if (!navigator.geolocation) {
      toast.push({ title: "Unsupported", description: "GPS is not supported by your browser.", type: "error", id: "gps-un" });
      return;
    }
    setUpdatingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { error } = await supabase
            .from("donors")
            .update({ lat: pos.coords.latitude, lng: pos.coords.longitude })
            .eq("id", user.id);

          if (error) throw error;
          
          setDonorRecord({ ...donorRecord, lat: pos.coords.latitude, lng: pos.coords.longitude });
          toast.push({ title: "Location Updated", description: "Approximate GPS coordinates refreshed successfully.", type: "success", id: "gps-ok" });
          fetchDashboardData();
        } catch (e: any) {
          toast.push({ title: "Error", description: e.message || "Failed to update location in database", type: "error", id: "gps-db-err" });
        } finally {
          setUpdatingLocation(false);
        }
      },
      (err) => {
        console.error(err);
        toast.push({ title: "GPS Error", description: "Permission denied or coordinates unavailable", type: "error", id: "gps-deny" });
        setUpdatingLocation(false);
      }
    );
  };

  // Auto calculate eligibility
  const getEligibility = () => {
    if (!donorRecord) return { eligible: true, daysLeft: 0, date: "" };
    if (!donorRecord.last_donation_date) return { eligible: true, daysLeft: 0, date: "Immediately" };

    const last = new Date(donorRecord.last_donation_date);
    const next = new Date(last.getTime() + 90 * 24 * 60 * 60 * 1000);
    const today = new Date();
    
    const diffTime = next.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      eligible: diffDays <= 0,
      daysLeft: diffDays > 0 ? diffDays : 0,
      date: next.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    };
  };

  const eligibility = getEligibility();

  // Canvas Certificate Generator
  const downloadDonationCertificate = (donation: any) => {
    if (!donorRecord) return;
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 550;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#060608";
    ctx.fillRect(0, 0, 800, 550);

    ctx.strokeStyle = "#E8192C";
    ctx.lineWidth = 10;
    ctx.strokeRect(20, 20, 760, 510);
    ctx.strokeStyle = "#9A0F1E";
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 32, 736, 486);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 34px serif";
    ctx.textAlign = "center";
    ctx.fillText("CERTIFICATE OF APPRECIATION", 400, 110);

    ctx.fillStyle = "#A0A0B0";
    ctx.font = "14px sans-serif";
    ctx.fillText("PROUDLY PRESENTED TO THE SAVIOR", 400, 170);

    ctx.fillStyle = "#E8192C";
    ctx.font = "bold 30px sans-serif";
    ctx.fillText(donorRecord.full_name.toUpperCase(), 400, 220);

    ctx.fillStyle = "#A0A0B0";
    ctx.font = "15px sans-serif";
    ctx.fillText(`For selflessly donating ${donation.units_donated || 1} Unit of Blood on ${donation.donation_date}`, 400, 275);
    ctx.fillText(`at ${donation.hospital_name || "Emergency Medical Clinic"}`, 400, 305);

    ctx.font = "14px sans-serif";
    ctx.fillText("Your noble act contributed directly to sustaining lives.", 400, 360);

    ctx.fillStyle = "#E8192C";
    ctx.font = "italic 16px serif";
    ctx.fillText('"Your blood. Someone\'s tomorrow."', 400, 420);

    ctx.strokeStyle = "#404050";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(140, 475);
    ctx.lineTo(290, 475);
    ctx.moveTo(510, 475);
    ctx.lineTo(660, 475);
    ctx.stroke();

    ctx.fillStyle = "#A0A0B0";
    ctx.font = "11px sans-serif";
    ctx.fillText("MEDICAL COORDINATOR", 215, 495);
    ctx.fillText("BLOODLINE DIRECTOR", 585, 495);

    ctx.fillStyle = "#E8192C";
    ctx.font = "20px cursive";
    ctx.fillText("Dr. S. Mohan", 215, 465);
    ctx.fillText("Bloodline Team", 585, 465);

    // Watermark drop
    ctx.font = "bold 60px sans-serif";
    ctx.fillText("ðŸ©¸", 400, 490);

    // Download file
    const link = document.createElement("a");
    link.download = `bloodline_certificate_${donation.donation_date}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-void flex flex-col items-center justify-center text-text-3 gap-2">
        <Activity className="h-10 w-10 text-vital animate-spin" />
        <span className="text-sm font-semibold tracking-widest">Loading Donor Dashboard...</span>
      </div>
    );
  }

  return (
    <ProtectedRoute role="donor">
      <main className="min-h-screen bg-void text-text pb-16 px-4">
        <div className="max-w-6xl mx-auto space-y-8 pt-8">
          
          {/* HEADER SECTION */}
          {donorRecord && (
            <section className="bg-surface border border-border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-vital-dim rounded-full blur-3xl -z-10" />
              
              <div className="flex items-center gap-4 flex-col sm:flex-row text-center sm:text-left">
                {/* Visual Avatar */}
                <div className="w-20 h-20 rounded-full bg-vital-dim border-2 border-vital flex items-center justify-center text-3xl font-black text-white relative">
                  <span>{donorRecord.full_name.charAt(0)}</span>
                  <div className="absolute -bottom-1 -right-1 bg-vital text-white text-[10px] font-black px-1.5 py-0.5 rounded-full border border-white">
                    {donorRecord.blood_group}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h2 className="text-2xl font-black text-text">{donorRecord.full_name}</h2>
                    <span className="bg-confirmed/10 border border-confirmed/30 text-confirmed text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Verified Life Saver
                    </span>
                  </div>
                  <p className="text-sm text-text-2">
                    Registered donor since {new Date(donorRecord.created_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                  </p>
                  <p className="text-xs text-text-3 font-semibold flex items-center justify-center sm:justify-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-vital" /> Approximate Coordinates: {donorRecord.lat.toFixed(4)}, {donorRecord.lng.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Counter Metrics */}
              <div className="flex gap-4 sm:gap-6 bg-void/60 p-4 rounded-xl border border-border/80">
                <div className="text-center px-2">
                  <span className="block text-2xl font-black text-vital">{donationsHistory.length}</span>
                  <span className="text-[10px] font-bold text-text-2 uppercase tracking-wider">Donations</span>
                </div>
                <div className="border-l border-border" />
                <div className="text-center px-2">
                  <span className="block text-2xl font-black text-white">{donationsHistory.length * 3}</span>
                  <span className="text-[10px] font-bold text-text-2 uppercase tracking-wider">Lives Saved</span>
                </div>
              </div>
            </section>
          )}

          {/* QUICK ACTIONS BAR */}
          {donorRecord && (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Toggle Availability Button */}
              <button 
                onClick={toggleAvailability}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                  donorRecord.is_available 
                    ? "bg-confirmed/5 border-confirmed/20 text-confirmed shadow-confirmed-glow hover:border-emerald-500/50" 
                    : "bg-surface border-border text-text-2 hover:border-border-2"
                }`}
              >
                <div>
                  <span className="block text-sm font-bold text-text">Emergency Availability</span>
                  <span className="text-xs">{donorRecord.is_available ? "Available to donate now" : "Unavailable temporarily"}</span>
                </div>
                {donorRecord.is_available ? (
                  <ToggleRight className="h-8 w-8 text-vital" />
                ) : (
                      <ToggleLeft className="h-8 w-8 text-text-3" />
                )}
              </button>

              {/* Refresh GPS Location */}
              <button 
                onClick={updateCoords}
                disabled={updatingLocation}
                className="flex items-center justify-between p-4 bg-surface border border-border hover:border-border-2 rounded-xl transition-all text-left group"
              >
                <div>
                  <span className="block text-sm font-bold text-text group-hover:text-vital transition-colors">Update GPS Coordinates</span>
                  <span className="text-xs text-text-2">Refreshes your approximate marker</span>
                </div>
                <Compass className={`h-6 w-6 text-vital ${updatingLocation ? 'animate-spin' : ''}`} />
              </button>

              {/* View Map */}
              <button 
                onClick={() => router.push("/map")}
                className="flex items-center justify-between p-4 bg-surface border border-border hover:border-border-2 rounded-xl transition-all text-left group"
              >
                <div>
                  <span className="block text-sm font-bold text-text group-hover:text-vital transition-colors">View Live Map</span>
                  <span className="text-xs text-text-2">Check active emergency requests</span>
                </div>
                <ArrowRight className="h-6 w-6 text-vital group-hover:translate-x-1 transition-transform" />
              </button>

            </section>
          )}

          {/* STATS CARDS */}
          {donorRecord && (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-surface p-4 rounded-xl border border-border">
                <span className="text-text-2 text-xs font-bold uppercase tracking-wider block">Donations this year</span>
                <span className="text-2xl font-black text-text mt-1 block">
                  {donationsHistory.filter(d => new Date(d.donation_date).getFullYear() === new Date().getFullYear()).length}
                </span>
              </div>

              <div className="bg-surface p-4 rounded-xl border border-border">
                <span className="text-text-2 text-xs font-bold uppercase tracking-wider block">Last Donation Date</span>
                <span className="text-2xl font-black text-text mt-1 block">
                  {donorRecord.last_donation_date ? new Date(donorRecord.last_donation_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never"}
                </span>
              </div>

              <div className="bg-surface p-4 rounded-xl border border-border">
                <span className="text-text-2 text-xs font-bold uppercase tracking-wider block">Next Eligibility</span>
                <span className={`text-2xl font-black mt-1 block ${eligibility.eligible ? "text-confirmed" : "text-warning"}`}>
                  {eligibility.eligible ? "Eligible Now" : eligibility.date}
                </span>
                {!eligibility.eligible && (
                  <span className="text-[10px] text-text-3 font-semibold block mt-0.5">{eligibility.daysLeft} days remaining</span>
                )}
              </div>

              <div className="bg-surface p-4 rounded-xl border border-border">
                <span className="text-text-2 text-xs font-bold uppercase tracking-wider block">Range Radius Limit</span>
                <span className="text-2xl font-black text-white mt-1 block">
                  {donorRecord.max_travel_km} km
                </span>
              </div>

            </section>
          )}

          {/* MAIN GRID - TIMELINE & NEARBY */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT 2/3 COLUMN: NEARBY REQUESTS & TIMELINE */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Nearby Requests Section */}
              <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-5 w-5 text-vital" />
                    <h3 className="font-bold text-base text-text">Matching Emergencies Nearby</h3>
                  </div>
                  <span className="text-xs text-text-3 font-semibold">{nearbyRequests.length} active matching cases</span>
                </div>

                <div className="space-y-3">
                  {nearbyRequests.length === 0 ? (
                    <div className="text-center py-8 text-xs text-text-2">
                      No active emergency requests found in your range matching your blood group.
                    </div>
                  ) : (
                    nearbyRequests.map(r => (
                      <div 
                        key={r.id}
                        className="bg-surface-2 p-4 border border-border/80 hover:border-border-2 rounded-xl flex items-center justify-between gap-4 transition-all"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 bg-vital-dim text-vital font-extrabold text-xs rounded border border-vital/30">
                              {r.blood_group_needed}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                              r.urgency_level === "CRITICAL" ? "bg-vital-mid text-vital border border-vital-dim" : "bg-warning/10 text-warning border border-warning/20"
                            }`}>
                              {r.urgency_level}
                            </span>
                          </div>
                          
                          <h4 className="text-sm font-bold text-white truncate">{r.hospital_name}</h4>
                          
                          <div className="flex flex-wrap text-[10px] text-text-2 gap-x-4">
                            <span>Bags: {r.units_needed}</span>
                            <span>Distance: {Math.round(r.distance * 10) / 10} km</span>
                            <span>Posted {new Date(r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => router.push("/map")}
                          className="px-4 py-2 bg-vital-dim border border-vital/40 text-vital hover:bg-vital hover:text-white rounded-lg text-xs font-bold transition-all flex-shrink-0"
                        >
                          Respond
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Timeline/History Section */}
              <div className="bg-surface rounded-2xl border border-border p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Award className="h-5 w-5 text-vital" />
                  <h3 className="font-bold text-base text-text">My Donation History</h3>
                </div>

                <div className="relative border-l-2 border-border pl-4 ml-2 space-y-6 py-2">
                  {donationsHistory.length === 0 ? (
                    <div className="text-xs text-text-2 pl-2">
                      No logs found. Your contributions will appear here once verified by hospitals.
                    </div>
                  ) : (
                    donationsHistory.map((don, idx) => (
                      <div key={don.id} className="relative group">
                        
                        {/* Bullet point indicator */}
                        <div className="absolute -left-[23px] top-1.5 w-3.5 h-3.5 rounded-full bg-vital border-2 border-void shadow-vital-glow" />

                        <div className="bg-surface-2 border border-border/80 p-4 rounded-xl space-y-2.5">
                          <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                              <span className="text-[10px] text-text-2 font-semibold block">Donation Date</span>
                              <span className="text-sm font-bold text-white">{new Date(don.donation_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                            </div>
                            
                            <button
                              onClick={() => downloadDonationCertificate(don)}
                              className="px-2.5 py-1.5 bg-surface border border-border hover:border-border-2 text-text-2 hover:text-white rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all"
                            >
                              <Download className="h-3 w-3 text-vital" /> Certificate
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] text-text-2">
                            <div>
                              <span className="text-text-3 block">Hospital</span>
                              <span className="font-semibold text-text">{don.hospital_name}</span>
                            </div>
                            <div>
                              <span className="text-text-3 block">Units Donated</span>
                              <span className="font-semibold text-text">{don.units_donated || 1} Bag</span>
                            </div>
                          </div>
                        </div>

                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: LIVE LOCATION + NOTIFICATION SETTINGS */}
            <div className="space-y-8">
              <LiveLocationToggle />
              
              <div className="bg-surface rounded-2xl border border-border p-6 space-y-6">
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Bell className="h-5 w-5 text-vital" />
                  <h3 className="font-bold text-base text-text">Alert Preferences</h3>
                </div>

                <div className="space-y-4">
                  {/* SMS Toggles */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold block text-white">SMS Alerts</span>
                      <span className="text-[10px] text-text-2">For urgent emergency requests</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setNotifSms(!notifSms)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${notifSms ? 'bg-vital' : 'bg-surface-2'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full transform duration-200 ${notifSms ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* WhatsApp Alerts */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold block text-white">WhatsApp Alerts</span>
                      <span className="text-[10px] text-text-2">Updates on responses & confirmation</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setNotifWhatsapp(!notifWhatsapp)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${notifWhatsapp ? 'bg-vital' : 'bg-surface-2'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full transform duration-200 ${notifWhatsapp ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Quiet Hours */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold block text-white">Quiet Hours (10 PM - 7 AM)</span>
                      <span className="text-[10px] text-text-2">Do not disturb except Criticals</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setNotifQuietHours(!notifQuietHours)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${notifQuietHours ? 'bg-vital' : 'bg-surface-2'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full transform duration-200 ${notifQuietHours ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Emergency Override */}
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <span className="text-sm font-semibold block text-white">Critical Override</span>
                      <span className="text-[10px] text-text-2">Always ring for CRITICAL cases</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setNotifOverride(!notifOverride)}
                      className={`w-10 h-5 rounded-full p-0.5 transition-colors focus:outline-none ${notifOverride ? 'bg-vital' : 'bg-surface-2'}`}
                    >
                      <div className={`bg-white w-4 h-4 rounded-full transform duration-200 ${notifOverride ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => toast.push({ title: "Preferences Saved", description: "Your notification settings have been updated.", type: "success", id: "pref-saved" })}
                    className="w-full py-2.5 bg-vital hover:bg-vital text-white text-xs font-bold rounded-lg transition-all"
                  >
                    Save Preference
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      </main>
    </ProtectedRoute>
  );
}
