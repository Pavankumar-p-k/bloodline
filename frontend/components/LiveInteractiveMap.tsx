"use client";

import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./ToastContext";
import { 
  Heart, MapPin, Compass, Navigation, 
  Phone, Calendar, Clock, CheckCircle2, X 
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

// Custom Marker Icons
const youIcon = L.divIcon({
  className: "",
  html: `<div class="relative flex items-center justify-center">
           <div class="absolute w-8 h-8 rounded-full bg-blue-500 animate-pulse opacity-40"></div>
           <div class="relative w-6 h-6 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[10px] text-white font-extrabold shadow-lg">👤</div>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const donorIcon = (bloodGroup: string) => L.divIcon({
  className: "",
  html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 border-2 border-white text-[10px] text-white font-extrabold shadow-[0_0_10px_rgba(34,197,94,0.4)]">
           ${bloodGroup}
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const requestIcon = (urgency: string, bloodGroup: string) => {
  const isCritical = urgency === "CRITICAL";
  return L.divIcon({
    className: "",
    html: `<div class="relative flex items-center justify-center">
             <div class="absolute ${isCritical ? 'w-12 h-12 bg-red-600' : 'w-9 h-9 bg-rose-500'} rounded-full animate-ping opacity-55"></div>
             <div class="relative w-8 h-8 rounded-full bg-[#C41E3A] border-2 border-white flex flex-col items-center justify-center text-[9px] text-white font-extrabold shadow-[0_0_12px_#C41E3A]">
               <span>${bloodGroup}</span>
             </div>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16]
  });
};

interface LiveInteractiveMapProps {
  userLat: number;
  userLng: number;
}

// Controller to auto center map
function AutoCenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);
  return null;
}

export default function LiveInteractiveMap({ userLat, userLng }: LiveInteractiveMapProps) {
  const { user, role } = useAuth();
  const toast = useToast();

  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [availableDonors, setAvailableDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterBlood, setFilterBlood] = useState("");
  const [filterDistance, setFilterDistance] = useState(50); // default 50km
  const [filterUrgency, setFilterUrgency] = useState(""); // All, CRITICAL, URGENT, PLANNED
  const [showLayer, setShowLayer] = useState("both"); // both, donors, requests
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Response Modal State
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);

  // Fetch Data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active requests
      const { data: requests, error: reqErr } = await supabase
        .from("blood_requests")
        .select("*")
        .eq("status", "pending");

      if (reqErr) throw reqErr;
      setActiveRequests(requests || []);

      // 2. Fetch available donors
      const { data: donorsData, error: donorErr } = await supabase
        .from("donors")
        .select("*")
        .eq("is_available", true)
        .eq("is_suspended", false);

      if (donorErr) throw donorErr;
      setAvailableDonors(donorsData || []);
    } catch (err: any) {
      console.error(err);
      toast.push({ title: "Fetch Error", description: err.message || "Failed to fetch map data", type: "error", id: "map-fetch-err" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup realtime subscription
    const requestsChannel = supabase
      .channel("map-realtime-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "blood_requests" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "donors" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(requestsChannel);
    };
  }, []);

  // Filter Logic
  const filteredRequests = activeRequests.filter(r => {
    if (showLayer === "donors") return false;
    if (filterBlood && r.blood_group_needed !== filterBlood) return false;
    if (filterUrgency && r.urgency_level !== filterUrgency) return false;
    
    // Distance filter
    const dist = getDistance(userLat, userLng, r.lat, r.lng);
    if (dist > filterDistance) return false;

    return true;
  });

  const filteredDonors = availableDonors.filter(d => {
    if (showLayer === "requests") return false;
    if (filterBlood && d.blood_group !== filterBlood) return false;
    
    // Distance filter
    const dist = getDistance(userLat, userLng, d.lat, d.lng);
    if (dist > filterDistance) return false;

    return true;
  });

  // Calculate elapsed time description
  const getTimeElapsed = (createdAt: string) => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    const mins = Math.floor(elapsedMs / (1000 * 60));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ago`;
  };

  // Open response details flow
  const handleOpenResponse = (reqItem: any) => {
    if (!user) {
      toast.push({ title: "Auth Required", description: "You must be signed in to help.", type: "info", id: "map-auth-req" });
      return;
    }
    if (role !== "donor") {
      toast.push({ title: "Access Blocked", description: "Only registered donors can respond to emergency blood requests.", type: "error", id: "map-donor-only" });
      return;
    }
    setSelectedRequest(reqItem);
    setResponseModalOpen(true);
    setRevealedPhone(null);
  };

  // Confirm Donor Support
  const confirmResponse = async () => {
    if (!selectedRequest || !user) return;
    setSubmittingResponse(true);

    try {
      // 1. Check if donor profile exists in Supabase
      const { data: donorRecord, error: dErr } = await supabase
        .from("donors")
        .select("id")
        .eq("id", user.id)
        .single();

      if (dErr || !donorRecord) {
        toast.push({ title: "Incomplete Profile", description: "Please complete your donor profile details first.", type: "info", id: "map-profile-incomplete" });
        setSubmittingResponse(false);
        return;
      }

      // 2. Submit Response
      const { error: insertErr } = await supabase
        .from("donor_responses")
        .insert([{
          request_id: selectedRequest.id,
          donor_id: user.id,
          status: "confirmed"
        }]);

      if (insertErr && !insertErr.message.includes("duplicate key")) {
        throw insertErr;
      }

      // 3. Increment counters locally via state OR fetch updated info
      toast.push({ title: "Response Confirmed!", description: "Your contact details have been shared with the requester.", type: "success", id: "respond-success" });
      
      // Reveal contact number immediately
      setRevealedPhone(selectedRequest.contact_phone);

      // Refresh list
      fetchData();
    } catch (e: any) {
      console.error(e);
      toast.push({ title: "Response Error", description: e.message || "Failed to confirm request response", type: "error", id: "confirm-err" });
    } finally {
      setSubmittingResponse(false);
    }
  };

  return (
    <div className="flex h-[88vh] bg-[#0A0A0A] overflow-hidden border-t border-zinc-900 relative">
      
      {/* SIDEBAR FOR ACTIVE REQUESTS (Collapsible) */}
      <div 
        className={`bg-[#1A1A1A] border-r border-zinc-800 transition-all duration-300 flex flex-col z-20 absolute sm:relative h-full ${
          sidebarOpen ? "w-80 left-0" : "w-0 -left-80 sm:left-0 sm:w-0 overflow-hidden border-r-0"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/40">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-[#C41E3A]" />
            <h3 className="font-bold text-[#F5F5F5] text-sm uppercase tracking-wider">Active Emergencies</h3>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="sm:hidden text-zinc-500 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sidebar Requests List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-24 bg-zinc-900 animate-pulse rounded-xl border border-zinc-800/40" />
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#9090A0]">No matching emergency requests found nearby.</div>
          ) : (
            filteredRequests.map(r => {
              const dist = getDistance(userLat, userLng, r.lat, r.lng);
              const isCritical = r.urgency_level === "CRITICAL";

              return (
                <div 
                  key={r.id}
                  className={`bg-[#0F0F0F] rounded-xl border p-4 space-y-3 transition-all relative overflow-hidden group hover:border-zinc-700 ${
                    isCritical 
                      ? "border-red-900/60 shadow-[0_0_12px_rgba(196,30,58,0.08)]" 
                      : "border-zinc-800"
                  }`}
                >
                  {/* Urgency Color Strip */}
                  <div className={`absolute top-0 left-0 w-1 h-full ${
                    r.urgency_level === "CRITICAL" ? "bg-[#C41E3A]" : r.urgency_level === "URGENT" ? "bg-amber-500" : "bg-blue-500"
                  }`} />

                  {/* Header: Blood and Distance */}
                  <div className="flex justify-between items-center pl-1">
                    <span className="px-2.5 py-1 bg-red-950/50 border border-red-600/40 text-[#C41E3A] font-black text-sm rounded-lg">
                      {r.blood_group_needed}
                    </span>
                    <span className="text-[11px] text-[#9090A0] font-semibold flex items-center gap-1">
                      <Navigation className="h-3 w-3" /> {Math.round(dist * 10) / 10} km
                    </span>
                  </div>

                  {/* Hospital & Time details */}
                  <div className="space-y-1 pl-1">
                    <h4 className="text-xs font-bold text-[#F5F5F5] truncate">{r.hospital_name}</h4>
                    <div className="flex justify-between text-[10px] text-[#9090A0]">
                      <span>{r.requester_type}</span>
                      <span>{getTimeElapsed(r.created_at)}</span>
                    </div>
                  </div>

                  {/* Respond button */}
                  <button
                    onClick={() => handleOpenResponse(r)}
                    className="w-full py-2 bg-red-950/20 border border-[#C41E3A]/40 text-[#C41E3A] hover:bg-[#C41E3A] hover:text-white rounded-lg text-xs font-extrabold transition-all"
                  >
                    I Can Help
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* FLOATING SIDEBAR TOGGLE ON MOBILE */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute left-4 top-16 bg-[#1A1A1A] border border-zinc-800 text-white p-3 rounded-full z-10 shadow-lg"
        >
          <Compass className="h-5 w-5 text-[#C41E3A]" />
        </button>
      )}

      {/* MAIN MAP CONTAINER */}
      <div className="flex-1 h-full relative">
        
        {/* TOP FLOATING FILTERS BAR */}
        <div className="absolute top-4 left-4 right-4 z-10 bg-[#1A1A1A]/95 border border-zinc-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Blood Type Filter */}
            <select
              value={filterBlood}
              onChange={(e) => setFilterBlood(e.target.value)}
              className="bg-[#0F0F0F] border border-zinc-800 rounded-lg text-xs text-[#F5F5F5] py-2 px-3 focus:outline-none"
            >
              <option value="">Blood Group (All)</option>
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Distance Filter */}
            <select
              value={filterDistance}
              onChange={(e) => setFilterDistance(Number(e.target.value))}
              className="bg-[#0F0F0F] border border-zinc-800 rounded-lg text-xs text-[#F5F5F5] py-2 px-3 focus:outline-none"
            >
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={20}>Within 20 km</option>
              <option value={50}>Within 50 km</option>
              <option value={100}>Within 100 km</option>
            </select>

            {/* Urgency Filter */}
            <select
              value={filterUrgency}
              onChange={(e) => setFilterUrgency(e.target.value)}
              className="bg-[#0F0F0F] border border-zinc-800 rounded-lg text-xs text-[#F5F5F5] py-2 px-3 focus:outline-none"
            >
              <option value="">Urgency (All)</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="URGENT">URGENT</option>
              <option value="PLANNED">PLANNED</option>
            </select>
          </div>

          {/* Toggle Layers */}
          <div className="flex items-center gap-1.5 bg-[#0F0F0F] p-0.5 rounded-lg border border-zinc-800">
            {['both', 'requests', 'donors'].map(l => (
              <button
                key={l}
                onClick={() => setShowLayer(l)}
                className={`text-[10px] uppercase font-extrabold px-3 py-1.5 rounded-md transition-all ${
                  showLayer === l ? 'bg-[#C41E3A] text-white' : 'text-[#9090A0] hover:text-white'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* MAP */}
        <MapContainer
          center={[userLat, userLng]}
          zoom={12}
          className="w-full h-full"
          style={{ background: "#0A0A0A" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <AutoCenterMap center={[userLat, userLng]} />

          {/* User Marker */}
          <Marker position={[userLat, userLng]} icon={youIcon}>
            <Popup>
              <div className="text-xs font-semibold p-1">You are here</div>
            </Popup>
          </Marker>

          {/* Request Markers */}
          {filteredRequests.map(r => {
            const dist = getDistance(userLat, userLng, r.lat, r.lng);
            return (
              <Marker
                key={r.id}
                position={[r.lat, r.lng]}
                icon={requestIcon(r.urgency_level, r.blood_group_needed)}
              >
                <Popup>
                  <div className="text-xs p-1.5 space-y-2 max-w-[200px]">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-[#C41E3A]">{r.blood_group_needed} Needed</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                        r.urgency_level === "CRITICAL" ? "bg-red-950 text-red-400" : "bg-amber-950 text-amber-400"
                      }`}>{r.urgency_level}</span>
                    </div>

                    <div className="text-[10px] text-zinc-400 space-y-0.5">
                      <p className="font-bold text-zinc-200">{r.hospital_name}</p>
                      <p>Units needed: {r.units_needed}</p>
                      <p>Distance: {Math.round(dist * 10) / 10} km</p>
                    </div>

                    <button
                      onClick={() => handleOpenResponse(r)}
                      className="w-full py-1.5 bg-[#C41E3A] hover:bg-[#8B0000] text-white font-extrabold rounded text-[9px] transition-all uppercase"
                    >
                      Respond to Request
                    </button>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Donor Markers */}
          {filteredDonors.map(d => {
            const dist = getDistance(userLat, userLng, d.lat, d.lng);
            return (
              <Marker
                key={d.id}
                position={[d.lat, d.lng]}
                icon={donorIcon(d.blood_group)}
              >
                <Popup>
                  <div className="text-xs p-1.5 space-y-1.5">
                    <p className="font-extrabold text-emerald-400">Verified Donor ({d.blood_group})</p>
                    <div className="text-[10px] text-zinc-400 space-y-0.5">
                      <p className="font-semibold text-zinc-200">{d.full_name}</p>
                      <p>City: {d.city}, {d.area}</p>
                      <p>Distance: {Math.round(dist * 10) / 10} km</p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* CONFIRMATION RESPOND MODAL */}
      {responseModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl relative">
            
            <button
              onClick={() => setResponseModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-red-950/60 text-[#C41E3A] mb-1">
                <Heart className="h-7 w-7 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-white">Can you donate today?</h3>
              <p className="text-xs text-[#9090A0]">
                Confirming matches you directly to this emergency case.
              </p>
            </div>

            {/* Travel details */}
            <div className="bg-[#0F0F0F] rounded-xl border border-zinc-800 p-4 space-y-3.5 text-xs text-zinc-300">
              <div className="flex justify-between items-center">
                <span>Blood Type Needed:</span>
                <span className="font-bold text-[#C41E3A] text-sm">{selectedRequest.blood_group_needed}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Hospital Location:</span>
                <span className="font-semibold text-white truncate max-w-[200px]">{selectedRequest.hospital_name}</span>
              </div>

              <div className="flex justify-between items-center">
                <span>Distance from you:</span>
                <span className="font-bold text-white">
                  {Math.round(getDistance(userLat, userLng, selectedRequest.lat, selectedRequest.lng) * 10) / 10} km
                </span>
              </div>

              <div className="flex justify-between items-center border-t border-zinc-800/80 pt-3">
                <span className="flex items-center gap-1 text-[#9090A0]"><Clock className="h-3.5 w-3.5" /> Estimated Travel:</span>
                <span className="font-bold text-emerald-400">
                  ~ {Math.round(getDistance(userLat, userLng, selectedRequest.lat, selectedRequest.lng) * 2 + 5)} minutes
                </span>
              </div>
            </div>

            {/* Success state (Revealed Phone) */}
            {revealedPhone ? (
              <div className="bg-emerald-950/40 border border-emerald-500/50 text-emerald-400 p-4 rounded-xl space-y-3 text-center">
                <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5" /> Phone Number Shared
                </div>
                <p className="text-[11px] leading-relaxed">
                  The hospital coordinator has been notified. Please contact them immediately:
                </p>
                <div className="text-lg font-black text-white flex items-center justify-center gap-2 mt-2 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <Phone className="h-5 w-5 text-emerald-400" /> {revealedPhone}
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-[#9090A0] text-center leading-relaxed">
                🛡️ Your phone number will only be shared with the hospital coordinator to coordinate travel.
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-3">
              {!revealedPhone ? (
                <>
                  <button
                    onClick={() => setResponseModalOpen(false)}
                    className="flex-1 py-3 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmResponse}
                    disabled={submittingResponse}
                    className="flex-1 py-3 bg-[#C41E3A] hover:bg-[#8B0000] text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                  >
                    {submittingResponse ? "Confirming..." : "Yes, I Can Donate"}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setResponseModalOpen(false)}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-bold transition-all"
                >
                  Close Window
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
