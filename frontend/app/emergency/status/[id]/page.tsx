"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import { useToast } from "../../../../components/ToastContext";
import { 
  Heart, CheckCircle2, Circle, Loader2, Phone, 
  Share2, Copy, Send, ExternalLink, Calendar, 
  MapPin, AlertTriangle, ShieldCheck 
} from "lucide-react";

export default function RequestStatusPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const id = params.id as string;

  const [request, setRequest] = useState<any | null>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // revealed phones mapping by response id
  const [revealedPhones, setRevealedPhones] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      // 1. Fetch request details
      const { data: reqData, error: reqErr } = await supabase
        .from("blood_requests")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (reqErr) throw reqErr;
      if (!reqData) {
        toast.push({ title: "Not Found", description: "The request ID could not be found.", type: "error", id: "status-404" });
        router.push("/");
        return;
      }
      setRequest(reqData);

      // 2. Fetch responses + join donor profiles
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
        .eq("request_id", id);

      if (respErr) throw respErr;
      setResponses(respData || []);

    } catch (e: any) {
      console.error(e);
      toast.push({ title: "Error", description: e.message || "Failed to fetch status details", type: "error", id: "fetch-status-err" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime changes for this request and its responses
    const statusChannel = supabase
      .channel(`status-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blood_requests", filter: `id=eq.${id}` },
        () => {
          fetchData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "donor_responses", filter: `request_id=eq.${id}` },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(statusChannel);
    };
  }, [id]);

  // Copy shareable link to clipboard
  const copyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.push({ title: "Link Copied", description: "Shareable status link copied to clipboard!", type: "success", id: "copied-link" });
  };

  // Share to WhatsApp
  const shareWhatsApp = () => {
    if (!request) return;
    const text = encodeURIComponent(
      `🚨 EMERGENCY BLOOD REQUIRED! 🚨\nBlood Type: ${request.blood_group_needed}\nUnits: ${request.units_needed}\nHospital: ${request.hospital_name}\nContact: ${request.contact_name}\nTrack live responses or offer help here: ${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  // Helper to format names (Privacy preservation)
  const formatPrivacyName = (fullName: string) => {
    const parts = fullName.split(" ");
    if (parts.length > 1) {
      return `${parts[0]} ${parts[1].charAt(0)}.`;
    }
    return fullName;
  };

  // Helper to reveal donor phone
  const revealPhone = (responseId: string, phone: string) => {
    setRevealedPhones(prev => ({ ...prev, [responseId]: phone }));
  };

  // Determine stage levels based on status and responses
  const getTrackerStages = () => {
    if (!request) return [];
    
    const isSubmitted = true;
    const isContacting = request.status === "pending" || request.status === "active";
    const hasResponded = responses.some(r => r.status === "confirmed" || r.status === "interested");
    const isEnRoute = responses.some(r => r.status === "confirmed");
    const isComplete = request.status === "fulfilled";

    return [
      { label: "Request Submitted", description: "Your broadcast is broadcasted to the network", status: "complete" },
      { label: "Contacting Donors", description: `${responses.length > 0 ? "Alerts dispatched successfully" : "Searching matching coordinates"}`, status: isContacting && responses.length === 0 ? "active" : "complete" },
      { label: "Donors Responding", description: `${responses.length} donor(s) flagged availability`, status: isComplete ? "complete" : hasResponded ? "complete" : "active" },
      { label: "Donors En Route", description: "Direct coordination in progress", status: isComplete ? "complete" : isEnRoute ? "active" : "pending" },
      { label: "Donation Complete", description: "Thank you for saving lives!", status: isComplete ? "complete" : "pending" }
    ];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center text-zinc-500 gap-2">
        <Loader2 className="h-10 w-10 text-[#C41E3A] animate-spin" />
        <span className="text-sm font-semibold tracking-widest">Resolving live tracking details...</span>
      </div>
    );
  }

  if (!request) return null;

  const stages = getTrackerStages();
  const confirmedDonors = responses.filter(r => r.status === "confirmed" || r.status === "interested");

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] pb-16 px-4">
      <div className="max-w-4xl mx-auto space-y-8 pt-8">
        
        {/* TOP STATUS CARD */}
        <section className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-start flex-wrap gap-4 border-b border-zinc-800 pb-4">
            <div>
              <span className="text-xs font-semibold text-[#9090A0] uppercase tracking-widest block">Live Status Pipeline</span>
              <h2 className="text-xl font-black text-white mt-1">Request ID: <span className="font-mono text-[#C41E3A] text-sm uppercase">{request.id.substring(0, 18)}</span></h2>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={copyLink}
                className="p-2.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[#9090A0] hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Copy className="h-3.5 w-3.5" /> Copy Link
              </button>
              <button 
                onClick={shareWhatsApp}
                className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <Share2 className="h-3.5 w-3.5" /> Share Request
              </button>
            </div>
          </div>

          {/* Core Request Highlights */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-zinc-500 block uppercase font-bold tracking-wider">Blood Needed</span>
              <span className="text-[#C41E3A] font-black text-lg mt-1 block">{request.blood_group_needed}</span>
            </div>
            <div>
              <span className="text-zinc-500 block uppercase font-bold tracking-wider">Units Requested</span>
              <span className="text-white font-bold text-lg mt-1 block">{request.units_needed} Bags</span>
            </div>
            <div>
              <span className="text-zinc-500 block uppercase font-bold tracking-wider">Hospital Location</span>
              <span className="text-white font-semibold text-sm mt-1 block truncate">{request.hospital_name}</span>
            </div>
            <div>
              <span className="text-zinc-500 block uppercase font-bold tracking-wider">Urgency Level</span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full inline-block mt-2 ${
                request.urgency_level === 'CRITICAL' ? 'bg-red-950/60 text-red-400 border border-red-500/20' : 'bg-amber-950/60 text-amber-400 border border-amber-500/20'
              }`}>{request.urgency_level}</span>
            </div>
          </div>
        </section>

        {/* TRACKER TIMELINE & DETAILED LIST */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* TRACKER PROGRESS BLOCK (Left 2/3) */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold text-sm uppercase tracking-wider text-[#9090A0] border-b border-zinc-800 pb-3 mb-6">Tracking Stages</h3>
              
              <div className="space-y-6">
                {stages.map((stg, idx) => (
                  <div key={idx} className="flex gap-4 items-start relative">
                    
                    {/* Vert line connecting icons */}
                    {idx < stages.length - 1 && (
                      <div className={`absolute left-3 top-7 w-0.5 h-10 -ml-px ${
                        stg.status === "complete" ? "bg-red-600" : "bg-zinc-800"
                      }`} />
                    )}

                    {/* Status icon indicators */}
                    <div className="flex-shrink-0 mt-0.5">
                      {stg.status === "complete" ? (
                        <CheckCircle2 className="h-6 w-6 text-[#C41E3A] bg-zinc-950 rounded-full" />
                      ) : stg.status === "active" ? (
                        <Loader2 className="h-6 w-6 text-red-500 animate-spin bg-zinc-950 rounded-full" />
                      ) : (
                        <Circle className="h-6 w-6 text-zinc-800 bg-zinc-950 rounded-full" />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <h4 className={`text-sm font-bold ${
                        stg.status === "complete" ? "text-white" : stg.status === "active" ? "text-[#C41E3A]" : "text-zinc-500"
                      }`}>{stg.label}</h4>
                      <p className="text-[11px] text-[#9090A0]">{stg.description}</p>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* Real-time Responses Counters */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#1A1A1A] p-4 rounded-xl border border-zinc-800 text-center">
                <span className="text-[10px] font-bold text-[#9090A0] uppercase tracking-wider block">Broadcast Reach</span>
                <span className="text-xl font-black text-white mt-1 block">
                  {responses.length + 8} Donors
                </span>
              </div>
              <div className="bg-[#1A1A1A] p-4 rounded-xl border border-zinc-800 text-center">
                <span className="text-[10px] font-bold text-[#9090A0] uppercase tracking-wider block">Responses</span>
                <span className="text-xl font-black text-[#C41E3A] mt-1 block">
                  {responses.length} Found
                </span>
              </div>
              <div className="bg-[#1A1A1A] p-4 rounded-xl border border-zinc-800 text-center">
                <span className="text-[10px] font-bold text-[#9090A0] uppercase tracking-wider block">Traveling</span>
                <span className="text-xl font-black text-emerald-400 mt-1 block">
                  {confirmedDonors.length} Confirmed
                </span>
              </div>
            </div>
          </div>

          {/* RESPONDING DONOR CARDS (Right 1/3) */}
          <div className="space-y-6">
            <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col h-full">
              <h3 className="font-bold text-sm uppercase tracking-wider text-[#9090A0] border-b border-zinc-800 pb-3 mb-4">Confirmed Donors</h3>

              <div className="flex-1 overflow-y-auto space-y-4 max-h-[380px] pr-1">
                {confirmedDonors.length === 0 ? (
                  <div className="text-center py-10 text-xs text-[#9090A0] space-y-3">
                    <Loader2 className="h-6 w-6 text-[#C41E3A] animate-spin mx-auto" />
                    <p>Waiting for nearby matching donors to accept the broadcast...</p>
                  </div>
                ) : (
                  confirmedDonors.map(res => {
                    const donorInfo = res.donors;
                    if (!donorInfo) return null;
                    
                    const distance = getDistance(request.lat, request.lng, donorInfo.lat, donorInfo.lng);
                    const eta = Math.round(distance * 2 + 5);

                    return (
                      <div 
                        key={res.id}
                        className="bg-[#0F0F0F] rounded-xl border border-zinc-800 p-4 space-y-3.5 transition-all hover:border-zinc-700"
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-white">
                            {formatPrivacyName(donorInfo.full_name)}
                          </span>
                          <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 font-extrabold text-[10px] rounded border border-emerald-500/20">
                            {donorInfo.blood_group}
                          </span>
                        </div>

                        <div className="text-[10px] text-zinc-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Status:</span>
                            <span className="text-emerald-400 font-bold">Traveling</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Estimated Travel:</span>
                            <span className="font-semibold text-white">~ {eta} mins</span>
                          </div>
                        </div>

                        {revealedPhones[res.id] ? (
                          <div className="bg-zinc-950 border border-zinc-850 p-2.5 rounded-lg text-xs flex items-center justify-center gap-1.5 font-bold text-white">
                            <Phone className="h-4 w-4 text-[#C41E3A]" /> {revealedPhones[res.id]}
                          </div>
                        ) : (
                          <button
                            onClick={() => revealPhone(res.id, donorInfo.phone)}
                            className="w-full py-2 bg-red-950/20 border border-[#C41E3A]/40 text-[#C41E3A] hover:bg-[#C41E3A] hover:text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1"
                          >
                            <Phone className="h-3.5 w-3.5" /> Reveal Contact No.
                          </button>
                        )}

                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

        </div>

        {/* EMERGENCY HELPLINE FOOTER */}
        <section className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#9090A0]">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span>Need immediate coordination support? Contact the Bloodline Helpdesk.</span>
          </div>
          <span className="text-white font-bold flex items-center gap-1">
            <Phone className="h-4 w-4 text-[#C41E3A]" /> National Helpline: +91 11-4567-8910
          </span>
        </section>

      </div>
    </main>
  );
}
