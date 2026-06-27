"use client";

import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./ToastContext";
import { Heart, MapPin, Compass, Navigation, Phone, Clock, CheckCircle2, X } from "lucide-react";

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const youIcon = L.divIcon({
  className: "",
  html: `<div class="relative flex items-center justify-center">
           <div class="absolute w-8 h-8 rounded-full bg-blue-500 animate-pulse opacity-40"></div>
           <div class="relative w-6 h-6 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[10px] text-white font-extrabold shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/></svg></div>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12],
});

const donorIcon = (bloodGroup: string) =>
  L.divIcon({
    className: "",
    html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-confirmed border-2 border-white text-[10px] text-white font-extrabold shadow-[0_0_10px_rgba(34,197,94,0.4)]">${bloodGroup}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

const requestIcon = (urgency: string, bloodGroup: string) => {
  const isCritical = urgency === "CRITICAL";
  return L.divIcon({
    className: "",
    html: `<div class="relative flex items-center justify-center">
             <div class="absolute ${isCritical ? "w-12 h-12" : "w-9 h-9"} rounded-full ${isCritical ? "bg-vital" : "bg-vital-dim"} animate-ping opacity-55"></div>
             <div class="relative w-8 h-8 rounded-full bg-vital border-2 border-white flex flex-col items-center justify-center text-[9px] text-white font-extrabold shadow-[0_0_12px_rgba(232,25,44,0.6)]">
               <span>${bloodGroup}</span>
             </div>
           </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

interface LiveInteractiveMapProps {
  userLat: number;
  userLng: number;
}

function AutoCenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 12);
  }, [center, map]);
  return null;
}

function MapContent({ userLat, userLng, filteredRequests, filteredDonors, onRespond }: {
  userLat: number;
  userLng: number;
  filteredRequests: any[];
  filteredDonors: any[];
  onRespond: (r: any) => void;
}) {
  const map = useMap();
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);

  useEffect(() => {
    if (clusterGroupRef.current) {
      map.removeLayer(clusterGroupRef.current);
    }

    const mcg = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 60,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          className: "",
          html: `<div class="flex items-center justify-center w-10 h-10 rounded-full bg-vital border-2 border-white text-xs text-white font-extrabold shadow-lg">${cluster.getChildCount()}</div>`,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        }),
    });

    // User marker
    const userMarker = L.marker([userLat, userLng], { icon: youIcon });
    userMarker.bindPopup('<div class="text-xs font-semibold p-1">You are here</div>');
    mcg.addLayer(userMarker);

    // Request markers
    filteredRequests.forEach((r) => {
      const marker = L.marker([r.lat, r.lng], { icon: requestIcon(r.urgency_level, r.blood_group_needed) });
      const dist = getDistance(userLat, userLng, r.lat, r.lng);
      marker.bindPopup(`
        <div class="text-xs p-1.5 space-y-2 max-w-[200px]">
          <div class="flex justify-between items-center">
            <span class="font-extrabold text-vital">${r.blood_group_needed} Needed</span>
            <span class="px-1.5 py-0.5 rounded text-[8px] font-black ${r.urgency_level === "CRITICAL" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}">${r.urgency_level}</span>
          </div>
          <div class="text-[10px] text-gray-600 space-y-0.5">
            <p class="font-bold text-gray-900">${r.hospital_name}</p>
            <p>Units needed: ${r.units_needed}</p>
            <p>Distance: ${Math.round(dist * 10) / 10} km</p>
          </div>
        </div>
      `);
      marker.on("click", () => onRespond(r));
      mcg.addLayer(marker);
    });

    // Donor markers
    filteredDonors.forEach((d) => {
      const marker = L.marker([d.lat, d.lng], { icon: donorIcon(d.blood_group) });
      const dist = getDistance(userLat, userLng, d.lat, d.lng);
      marker.bindPopup(`
        <div class="text-xs p-1.5 space-y-1.5">
          <p class="font-extrabold text-emerald-600">Donor (${d.blood_group})</p>
          <div class="text-[10px] text-gray-600 space-y-0.5">
            <p class="font-semibold text-gray-900">${d.full_name}</p>
            <p>City: ${d.city}, ${d.area}</p>
            <p>Distance: ${Math.round(dist * 10) / 10} km</p>
          </div>
        </div>
      `);
      mcg.addLayer(marker);
    });

    map.addLayer(mcg);
    clusterGroupRef.current = mcg;

    return () => {
      if (clusterGroupRef.current) {
        map.removeLayer(clusterGroupRef.current);
      }
    };
  }, [map, userLat, userLng, filteredRequests, filteredDonors, onRespond]);

  return null;
}

export default function LiveInteractiveMap({ userLat, userLng }: LiveInteractiveMapProps) {
  const { user, role } = useAuth();
  const toast = useToast();
  const [activeRequests, setActiveRequests] = useState<any[]>([]);
  const [availableDonors, setAvailableDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBlood, setFilterBlood] = useState("");
  const [filterDistance, setFilterDistance] = useState(50);
  const [filterUrgency, setFilterUrgency] = useState("");
  const [showLayer, setShowLayer] = useState("both");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [responseModalOpen, setResponseModalOpen] = useState(false);
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: requests } = await supabase.from("blood_requests").select("*").eq("status", "pending");
      setActiveRequests(requests || []);
      const { data: donorsData } = await supabase.from("donors").select("*").eq("is_available", true).eq("is_suspended", false);
      setAvailableDonors(donorsData || []);
    } catch (err: any) {
      toast.push({ title: "Fetch Error", description: err.message || "Failed to fetch map data", type: "error", id: "map-fetch-err" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const requestsChannel = supabase
      .channel("map-realtime-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "blood_requests" }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "donors" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(requestsChannel); };
  }, []);

  const filteredRequests = activeRequests.filter((r) => {
    if (showLayer === "donors") return false;
    if (filterBlood && r.blood_group_needed !== filterBlood) return false;
    if (filterUrgency && r.urgency_level !== filterUrgency) return false;
    if (getDistance(userLat, userLng, r.lat, r.lng) > filterDistance) return false;
    return true;
  });

  const filteredDonors = availableDonors.filter((d) => {
    if (showLayer === "requests") return false;
    if (filterBlood && d.blood_group !== filterBlood) return false;
    if (getDistance(userLat, userLng, d.lat, d.lng) > filterDistance) return false;
    return true;
  });

  const getTimeElapsed = (createdAt: string) => {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ago`;
  };

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

  const confirmResponse = async () => {
    if (!selectedRequest || !user) return;
    setSubmittingResponse(true);
    try {
      const { data: donorRecord } = await supabase.from("donors").select("id").eq("id", user.id).single();
      if (!donorRecord) {
        toast.push({ title: "Incomplete Profile", description: "Please complete your donor profile details first.", type: "info", id: "map-profile-incomplete" });
        setSubmittingResponse(false);
        return;
      }
      await supabase.from("donor_responses").insert([{ request_id: selectedRequest.id, donor_id: user.id, status: "confirmed" }]);
      toast.push({ title: "Response Confirmed!", description: "Your contact details have been shared with the requester.", type: "success", id: "respond-success" });
      setRevealedPhone(selectedRequest.contact_phone);
      fetchData();
    } catch (e: any) {
      toast.push({ title: "Response Error", description: e.message || "Failed to confirm", type: "error", id: "confirm-err" });
    } finally {
      setSubmittingResponse(false);
    }
  };

  return (
    <div className="flex h-[88vh] bg-void overflow-hidden border-t border-border relative">
      {/* Sidebar */}
      <div className={`bg-surface border-r border-border transition-all duration-300 flex flex-col z-20 absolute sm:relative h-full ${sidebarOpen ? "w-80 left-0" : "w-0 -left-80 sm:left-0 sm:w-0 overflow-hidden border-r-0"}`}>
        <div className="p-4 border-b border-border flex justify-between items-center bg-surface/40">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-vital" />
            <h3 className="font-bold text-text text-sm uppercase tracking-wider">Active Emergencies</h3>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="sm:hidden text-text-3 hover:text-text">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => <div key={n} className="h-24 bg-surface animate-pulse rounded-xl border border-border/40" />)}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-10 text-xs text-text-2">No matching emergency requests found nearby.</div>
          ) : (
            filteredRequests.map((r) => {
              const dist = getDistance(userLat, userLng, r.lat, r.lng);
              return (
                <div key={r.id} className={`bg-surface-2 rounded-xl border p-4 space-y-3 transition-all relative overflow-hidden group hover:border-border-2 ${r.urgency_level === "CRITICAL" ? "border-vital-dim shadow-[0_0_12px_rgba(232,25,44,0.08)]" : "border-border"}`}>
                  <div className={`absolute top-0 left-0 w-1 h-full ${r.urgency_level === "CRITICAL" ? "bg-vital" : r.urgency_level === "URGENT" ? "bg-warning" : "bg-text-3"}`} />
                  <div className="flex justify-between items-center pl-1">
                    <span className="px-2.5 py-1 bg-vital-dim border border-vital-dim text-vital font-black text-sm rounded-lg">{r.blood_group_needed}</span>
                    <span className="text-[11px] text-text-2 font-semibold flex items-center gap-1">
                      <Navigation className="h-3 w-3" /> {Math.round(dist * 10) / 10} km
                    </span>
                  </div>
                  <div className="space-y-1 pl-1">
                    <h4 className="text-xs font-bold text-text truncate">{r.hospital_name}</h4>
                    <div className="flex justify-between text-[10px] text-text-2">
                      <span>{r.requester_type}</span>
                      <span>{getTimeElapsed(r.created_at)}</span>
                    </div>
                  </div>
                  <button onClick={() => handleOpenResponse(r)} className="w-full py-2 bg-vital-dim border border-vital/40 text-vital hover:bg-vital hover:text-text rounded-lg text-xs font-extrabold transition-all">
                    I Can Help
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {!sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)} className="absolute left-4 top-16 bg-surface border border-border text-text p-3 rounded-full z-10 shadow-lg">
          <Compass className="h-5 w-5 text-vital" />
        </button>
      )}

      {/* Map */}
      <div className="flex-1 h-full relative">
        <div className="absolute top-4 left-4 right-4 z-10 bg-surface/95 border border-border/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-3">
            <select value={filterBlood} onChange={(e) => setFilterBlood(e.target.value)} className="bg-surface-2 border border-border rounded-lg text-xs text-text py-2 px-3 focus:outline-none">
              <option value="">Blood Group (All)</option>
              {["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"].map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select value={filterDistance} onChange={(e) => setFilterDistance(Number(e.target.value))} className="bg-surface-2 border border-border rounded-lg text-xs text-text py-2 px-3 focus:outline-none">
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={20}>Within 20 km</option>
              <option value={50}>Within 50 km</option>
              <option value={100}>Within 100 km</option>
            </select>
            <select value={filterUrgency} onChange={(e) => setFilterUrgency(e.target.value)} className="bg-surface-2 border border-border rounded-lg text-xs text-text py-2 px-3 focus:outline-none">
              <option value="">Urgency (All)</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="URGENT">URGENT</option>
              <option value="PLANNED">PLANNED</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 bg-surface-2 p-0.5 rounded-lg border border-border">
            {["both", "requests", "donors"].map((l) => (
              <button key={l} onClick={() => setShowLayer(l)}
                className={`text-[10px] uppercase font-extrabold px-3 py-1.5 rounded-md transition-all ${showLayer === l ? "bg-vital text-text" : "text-text-2 hover:text-text"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <MapContainer center={[userLat, userLng]} zoom={12} className="w-full h-full" style={{ background: "#060608" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
          <AutoCenterMap center={[userLat, userLng]} />
          <MapContent
            userLat={userLat}
            userLng={userLng}
            filteredRequests={filteredRequests}
            filteredDonors={filteredDonors}
            onRespond={handleOpenResponse}
          />
        </MapContainer>
      </div>

      {/* Response Modal */}
      {responseModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl relative">
            <button onClick={() => setResponseModalOpen(false)} className="absolute top-4 right-4 text-text-3 hover:text-text">
              <X className="h-5 w-5" />
            </button>
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-vital-dim text-vital mb-1">
                <Heart className="h-7 w-7 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-text">Can you donate today?</h3>
              <p className="text-xs text-text-2">Confirming matches you directly to this emergency case.</p>
            </div>
            <div className="bg-surface-2 rounded-xl border border-border p-4 space-y-3.5 text-xs text-text">
              <div className="flex justify-between items-center">
                <span>Blood Type Needed:</span>
                <span className="font-bold text-vital text-sm">{selectedRequest.blood_group_needed}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Hospital Location:</span>
                <span className="font-semibold text-text truncate max-w-[200px]">{selectedRequest.hospital_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Distance from you:</span>
                <span className="font-bold text-text">{Math.round(getDistance(userLat, userLng, selectedRequest.lat, selectedRequest.lng) * 10) / 10} km</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/80 pt-3">
                <span className="flex items-center gap-1 text-text-2"><Clock className="h-3.5 w-3.5" /> Estimated Travel:</span>
                <span className="font-bold text-confirmed">~ {Math.round(getDistance(userLat, userLng, selectedRequest.lat, selectedRequest.lng) * 2 + 5)} minutes</span>
              </div>
            </div>
            {revealedPhone ? (
              <div className="bg-confirmed/5 border border-confirmed/20 text-confirmed p-4 rounded-xl space-y-3 text-center">
                <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5" /> Phone Number Shared
                </div>
                <p className="text-[11px] leading-relaxed text-text-2">The hospital coordinator has been notified. Please contact them immediately:</p>
                <div className="text-lg font-black text-text flex items-center justify-center gap-2 mt-2 bg-void p-2.5 rounded-lg border border-border">
                  <Phone className="h-5 w-5 text-confirmed" /> {revealedPhone}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-text-2 text-center leading-relaxed">Your phone number will only be shared with the hospital coordinator to coordinate travel.</p>
            )}
            <div className="flex gap-3">
              {!revealedPhone ? (
                <>
                  <button onClick={() => setResponseModalOpen(false)} className="flex-1 py-3 border border-border text-text-2 hover:text-text rounded-lg text-xs font-bold transition-all">Cancel</button>
                  <button onClick={confirmResponse} disabled={submittingResponse} className="flex-1 py-3 bg-vital hover:brightness-90 text-text rounded-lg text-xs font-bold transition-all disabled:opacity-50">
                    {submittingResponse ? "Confirming..." : "Yes, I Can Donate"}
                  </button>
                </>
              ) : (
                <button onClick={() => setResponseModalOpen(false)} className="w-full py-3 bg-surface-2 hover:bg-surface text-text rounded-lg text-xs font-bold transition-all">Close Window</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
