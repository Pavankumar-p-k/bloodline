"use client";

import React, { useEffect, useState } from "react";
import ProtectedRoute from "../../../components/ProtectedRoute";
import { useAuth } from "../../../context/AuthContext";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useToast } from "../../../components/ToastContext";
import { 
  Plus, LogOut, Loader2, Heart, MapPin, 
  Phone, Calendar, AlertTriangle, ShieldCheck, 
  ArrowRight, CheckCircle2 
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

export default function HospitalDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [requests, setRequests] = useState<any[]>([]);
  const [responsesMap, setResponsesMap] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState<boolean>(true);

  const fetchHospitalData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Fetch requests created by this hospital coordinator
      const { data: reqs, error: reqErr } = await supabase
        .from("blood_requests")
        .select("*")
        .eq("requester_id", user.id)
        .order("created_at", { ascending: false });

      if (reqErr) throw reqErr;
      setRequests(reqs || []);

      // 2. Fetch responses for each request
      if (reqs && reqs.length > 0) {
        const map: Record<string, any[]> = {};
        for (const req of reqs) {
          const { data: respData, error: respErr } = await supabase
            .from("donor_responses")
            .select(`
              id,
              status,
              responded_at,
              donated_at,
              donor_id,
              donors (
                full_name,
                blood_group,
                phone,
                lat,
                lng
              )
            `)
            .eq("request_id", req.id);

          if (!respErr && respData) {
            map[req.id] = respData;
          } else {
            map[req.id] = [];
          }
        }
        setResponsesMap(map);
      }
    } catch (err: any) {
      console.error(err);
      toast.push({ title: "Fetch Error", description: err.message || "Failed to load requests", type: "error", id: "hosp-fetch-err" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalData();

    // Subscribe to realtime updates for requests/responses
    const hospChannel = supabase
      .channel("hospital-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "blood_requests" }, () => fetchHospitalData())
      .on("postgres_changes", { event: "*", schema: "public", table: "donor_responses" }, () => fetchHospitalData())
      .subscribe();

    return () => {
      supabase.removeChannel(hospChannel);
    };
  }, [user?.id]);

  const handleFulfillRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from("blood_requests")
        .update({ status: "fulfilled" })
        .eq("id", requestId);

      if (error) throw error;
      toast.push({ title: "Success", description: "Request marked as Fulfilled. Thank you!", type: "success", id: "hosp-full-ok" });
      fetchHospitalData();
    } catch (e: any) {
      toast.push({ title: "Action Failed", description: e.message, type: "error", id: "hosp-full-err" });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <ProtectedRoute role="hospital">
      <main className="min-h-screen bg-void text-text pb-16 px-4">
        <div className="max-w-5xl mx-auto space-y-8 pt-8">
          
          {/* HEADER SECTION */}
          <header className="bg-surface border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div>
              <span className="text-xs font-semibold text-text-2 uppercase tracking-widest block">Coordinator Command</span>
              <h1 className="text-2xl font-black text-white mt-1">Hospital Dashboard</h1>
              <p className="text-xs text-text-2 mt-0.5 font-mono">{user?.email}</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => router.push("/emergency")}
                className="px-4 py-2.5 bg-vital hover:bg-vital text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-vital-glow"
              >
                <Plus className="h-4 w-4" /> Create Request
              </button>
              <button 
                onClick={handleLogout}
                className="px-4 py-2.5 bg-surface hover:bg-surface-2 border border-border text-text hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          </header>

          {/* ACTIVE REQUESTS LIST */}
          <section className="space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Heart className="h-5 w-5 text-vital animate-pulse" /> Emergency Broadcast Logs
              </h3>
              <span className="text-xs text-text-2 font-semibold">{requests.length} Broadcasted</span>
            </div>

            {loading ? (
              <div className="text-center py-12 space-y-3">
                <Loader2 className="h-8 w-8 text-vital animate-spin mx-auto" />
                <p className="text-xs text-text-3 font-semibold uppercase tracking-wider">Syncing database changes...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-surface border border-border rounded-2xl p-12 text-center space-y-4">
                <p className="text-sm text-text-2">No emergency requests registered under your coordinator account.</p>
                <button
                  onClick={() => router.push("/emergency")}
                  className="px-5 py-3 bg-vital hover:bg-vital text-white font-bold rounded-lg text-xs transition-all inline-flex items-center gap-1"
                >
                  Create Your First Emergency Request <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {requests.map(req => {
                  const resList = responsesMap[req.id] || [];
                  const confirmedRes = resList.filter(r => r.status === "confirmed");
                  const isFulfilled = req.status === "fulfilled";

                  return (
                    <div 
                      key={req.id} 
                      className={`bg-surface border rounded-2xl p-6 shadow-xl space-y-6 relative overflow-hidden ${
                        isFulfilled ? "border-border opacity-80" : "border-border"
                      }`}
                    >
                      {/* Header info */}
                      <div className="flex justify-between items-start flex-wrap gap-4 border-b border-border pb-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2.5 py-0.5 bg-vital-dim text-vital font-black text-xs rounded border border-vital/20">
                              {req.blood_group_needed} Needed
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                              req.urgency_level === "CRITICAL" ? "bg-vital-dim text-vital border border-vital-dim" : "bg-warning/10 text-warning border border-warning/20"
                            }`}>
                              {req.urgency_level}
                            </span>
                            <span className="text-[10px] text-text-3">
                              Posted: {new Date(req.created_at).toLocaleDateString("en-IN")} at {new Date(req.created_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                            </span>
                          </div>
                          
                          <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-vital" /> Hospital: {req.hospital_name}
                          </h4>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/emergency/status/${req.id}`)}
                            className="px-3 py-1.5 bg-void hover:bg-black border border-border text-text-2 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          >
                            Track Live Page <ExternalLinkIcon className="h-3.5 w-3.5" />
                          </button>
                          
                          {!isFulfilled && (
                            <button
                              onClick={() => handleFulfillRequest(req.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all"
                            >
                              Mark Fulfilled
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Donor responses detail */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-extrabold uppercase tracking-wider text-text-2">Matched Donor Responses ({resList.length})</h5>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {resList.length === 0 ? (
                            <div className="text-xs text-text-3 italic py-2 col-span-3">No donors matched yet. Alert broadcasts are pending review or active routing.</div>
                          ) : (
                            resList.map((res: any) => {
                              const dInfo = res.donors;
                              if (!dInfo) return null;
                              
                              const distance = getDistance(req.lat, req.lng, dInfo.lat, dInfo.lng);
                              const eta = Math.round(distance * 2 + 5);

                              return (
                                <div 
                                  key={res.id} 
                                  className="bg-surface-2 rounded-xl border border-border p-4 space-y-2.5 transition-all hover:border-border"
                                >
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-white">{dInfo.full_name}</span>
                                    <span className="px-2 py-0.5 bg-confirmed/10 text-confirmed font-extrabold text-[9px] rounded">
                                      {dInfo.blood_group}
                                    </span>
                                  </div>

                                  <div className="text-[10px] text-text-2 space-y-1">
                                    <div className="flex justify-between">
                                      <span>Travel ETA:</span>
                                      <span className="font-bold text-white">~ {eta} mins ({Math.round(distance * 10) / 10} km)</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1 border-t border-zinc-900 pt-1">
                                      <Phone className="h-3 w-3 text-confirmed" />
                                      <span className="font-mono text-white text-[11px] font-bold">{dInfo.phone}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>
      </main>
    </ProtectedRoute>
  );
}

// Icon helper
function ExternalLinkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}
