"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { 
  Heart, ArrowRight, ShieldAlert, Sparkles, 
  MapPin, HelpCircle, Activity, ShieldCheck, 
  Phone, Info, FileText 
} from "lucide-react";

export default function HomePage() {
  // Stats Counters State
  const [totalDonors, setTotalDonors] = useState(6); // Default mock seed counts
  const [fulfilledToday, setFulfilledToday] = useState(1);
  const [livesImpacted, setLivesImpacted] = useState(3);
  
  const [tickerRequests, setTickerRequests] = useState<any[]>([]);
  const [donorsList, setDonorsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLandingData = async () => {
    try {
      // 1. Fetch total donors count
      const { count: donorsCount } = await supabase
        .from("donors")
        .select("id", { count: "exact", head: true });
      
      if (donorsCount !== null) setTotalDonors(donorsCount);

      // 2. Fetch requests fulfilled count
      const { count: fulfilledCount } = await supabase
        .from("blood_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "fulfilled");

      if (fulfilledCount !== null) {
        setFulfilledToday(fulfilledCount);
        setLivesImpacted(fulfilledCount * 3);
      }

      // 3. Fetch active requests for ticker
      const { data: activeReqs } = await supabase
        .from("blood_requests")
        .select("blood_group_needed,city,urgency_level")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      setTickerRequests(activeReqs || []);

      // 4. Fetch all donors for availability grid
      const { data: donors } = await supabase
        .from("donors")
        .select("blood_group,is_available");

      setDonorsList(donors || []);
    } catch (e) {
      console.warn("Could not query live stats, using mock seeds:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLandingData();

    // Subscribe to updates on homepage
    const homeChannel = supabase
      .channel("home-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "blood_requests" }, () => fetchLandingData())
      .on("postgres_changes", { event: "*", schema: "public", table: "donors" }, () => fetchLandingData())
      .subscribe();

    return () => {
      supabase.removeChannel(homeChannel);
    };
  }, []);

  // Helper to resolve blood grid counts & colors
  const getBloodTypeDetails = (bg: string) => {
    const count = donorsList.filter(d => d.blood_group === bg && d.is_available).length;
    let colorClass = "bg-vital-dim border-vital-mid text-vital shadow-[0_0_10px_rgba(239,68,68,0.05)]";
    let status = "CRITICAL";

    if (count >= 3) {
      colorClass = "bg-confirmed/5 border-confirmed/20 text-confirmed shadow-[0_0_10px_rgba(16,185,129,0.05)]";
      status = "STABLE";
    } else if (count > 0) {
      colorClass = "bg-warning/10/20 border-amber-500/30 text-warning shadow-[0_0_10px_rgba(245,158,11,0.05)]";
      status = "LOW";
    }

    return { count, colorClass, status };
  };

  return (
    <main className="bg-void min-h-screen text-text overflow-hidden pb-12">
      
      {/* 1. URGENCY TICKER (Scrolling Banner) */}
      {tickerRequests.length > 0 && (
        <div className="bg-vital-dim border-b border-vital-dim py-2.5 overflow-hidden text-xs">
          <div className="flex gap-8 animate-[marquee_25s_linear_infinite] whitespace-nowrap items-center">
            {Array(3).fill(tickerRequests).flat().map((req, idx) => (
              <div key={idx} className="inline-flex items-center gap-2 text-text">
                <span className="w-1.5 h-1.5 rounded-full bg-vital animate-ping" />
                <span className="font-extrabold text-vital">{req.blood_group_needed}</span> REQUIRED IN
                <span className="font-semibold text-white uppercase">{req.city}</span>
                <span className="px-1 py-0.5 rounded text-[8px] font-black bg-red-600/20 border border-vital-dim text-vital">
                  {req.urgency_level}
                </span>
                <span className="mx-4 text-zinc-700">|</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. HERO SECTION */}
      <section className="relative max-w-6xl mx-auto px-4 pt-16 pb-12 sm:pt-20 sm:pb-16 flex flex-col items-center text-center space-y-8">
        
        {/* CSS Animated Blood Drop SVG */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-24 h-24 bg-vital-dim border border-red-600/20 rounded-full blur-2xl animate-pulse" />
          
          <svg className="w-20 h-28 drop-shadow-[0_0_15px_rgba(196,30,58,0.5)] transform hover:scale-105 transition-transform duration-300 cursor-pointer" viewBox="0 0 100 150">
            <style>
              {`
                .blood-fill {
                  fill: url(#bloodGradient);
                  animation: pulseDrop 4s ease-in-out infinite;
                  transform-origin: 50% 70%;
                }
                @keyframes pulseDrop {
                  0%, 100% { transform: scale(1); }
                  50% { transform: scale(1.05) translateY(-2px); }
                }
              `}
            </style>
            <defs>
              <linearGradient id="bloodGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#C41E3A" />
                <stop offset="100%" stopColor="#8B0000" />
              </linearGradient>
            </defs>
            <path 
              className="blood-fill" 
              d="M50,0 C50,0 10,70 10,105 A40,40 0 0,0 90,105 C90,70 50,0 50,0 Z" 
            />
          </svg>
        </div>

        {/* Headline */}
        <div className="space-y-4 max-w-3xl">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-white">
            Your blood. <br className="sm:hidden" />
            <span className="text-vital">Someone's tomorrow.</span>
          </h1>
          <p className="text-sm sm:text-lg text-text-2 max-w-xl mx-auto font-medium">
            India's production-grade blood donation grid. Connect donors to emergency patients in real time.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4 justify-center">
          <Link href="/donor/register" className="w-full sm:w-56">
            <button className="w-full px-6 py-4 rounded-xl bg-vital hover:bg-vital text-white font-bold transition-all shadow-vital-glow hover:shadow-vital-glow flex items-center justify-center gap-2">
              I Want To Donate <ArrowRight className="h-4.5 w-4.5" />
            </button>
          </Link>
          <Link href="/emergency" className="w-full sm:w-56">
            <button className="w-full px-6 py-4 rounded-xl bg-surface hover:bg-surface-2 text-text font-bold border border-border hover:border-border-2 transition-all flex items-center justify-center gap-2">
              I Need Blood Now <ShieldAlert className="h-4.5 w-4.5 text-vital" />
            </button>
          </Link>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-3 gap-6 sm:gap-12 bg-surface p-6 rounded-2xl border border-border max-w-2xl w-full mt-10">
          <div className="text-center">
            <span className="block text-2xl sm:text-3xl font-black text-vital tracking-tight">{totalDonors}</span>
            <span className="text-[10px] font-extrabold text-text-2 uppercase tracking-wider mt-1 block">Active Donors</span>
          </div>
          <div className="border-l border-border" />
          <div className="text-center">
            <span className="block text-2xl sm:text-3xl font-black text-white tracking-tight">{fulfilledToday}</span>
            <span className="text-[10px] font-extrabold text-text-2 uppercase tracking-wider mt-1 block">Fulfilled Today</span>
          </div>
          <div className="border-l border-border" />
          <div className="text-center">
            <span className="block text-2xl sm:text-3xl font-black text-confirmed tracking-tight">{livesImpacted}</span>
            <span className="text-[10px] font-extrabold text-text-2 uppercase tracking-wider mt-1 block">Lives Saved</span>
          </div>
        </div>

      </section>

      {/* 3. STATS BAR */}
      <section className="bg-void border-y border-border py-8 px-4 mt-8">
        <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <span className="text-[10px] font-bold text-text-2 uppercase tracking-widest block">Donors Registered</span>
            <span className="text-xl font-bold text-white mt-1.5 block">10,000+ Nationally</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-text-2 uppercase tracking-widest block">Requests Dispatched</span>
            <span className="text-xl font-bold text-white mt-1.5 block">4,200 Cases</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-text-2 uppercase tracking-widest block">Cities Covered</span>
            <span className="text-xl font-bold text-white mt-1.5 block">48 Metro Hubs</span>
          </div>
          <div className="text-center">
            <span className="text-[10px] font-bold text-text-2 uppercase tracking-widest block">Avg Response Time</span>
            <span className="text-xl font-bold text-confirmed mt-1.5 block">14.8 Minutes</span>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS SECTION */}
      <section className="max-w-6xl mx-auto px-4 py-16 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-white">How It Works</h2>
          <p className="text-sm text-text-2">Dual-pipeline coordination for absolute speed</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* For Donors */}
          <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border space-y-6">
            <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-border pb-3">
              <span className="text-confirmed">ðŸŸ¢</span> For Donors
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-surface-2 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">1</div>
                <p className="text-xs text-text-2"><span className="text-white font-semibold">Register:</span> Provide your health metadata, weight, and blood group details.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-surface-2 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">2</div>
                <p className="text-xs text-text-2"><span className="text-white font-semibold">Pick Location:</span> Drag Leaflet pins to mark coordinates without disclosing exact address.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-surface-2 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">3</div>
                <p className="text-xs text-text-2"><span className="text-white font-semibold">Respond:</span> Receive notifications for nearby critical demands and confirm route travel.</p>
              </div>
            </div>
          </div>

          {/* For Requesters */}
          <div className="bg-surface p-6 sm:p-8 rounded-2xl border border-border space-y-6">
            <h3 className="text-lg font-black text-white flex items-center gap-2 border-b border-border pb-3">
              <span className="text-vital">ðŸ”´</span> For Requesters
            </h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-surface-2 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">1</div>
                <p className="text-xs text-text-2"><span className="text-white font-semibold">Request:</span> Set blood type, units, and drop coordinates where bags are needed.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-surface-2 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">2</div>
                <p className="text-xs text-text-2"><span className="text-white font-semibold">Verify:</span> Upload letters or slips and verify contact numbers via SMS OTP.</p>
              </div>
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-surface-2 text-white font-bold flex items-center justify-center text-xs flex-shrink-0">3</div>
                <p className="text-xs text-text-2"><span className="text-white font-semibold">Track Live:</span> Check confirmations and coordination numbers in real time.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BLOOD TYPE AVAILABILITY GRID */}
      <section className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-black text-white">Grid Status Monitor</h2>
          <p className="text-xs text-text-2">Real-time donor counts matching universal and secondary groups</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bg => {
            const { count, colorClass, status } = getBloodTypeDetails(bg);
            return (
              <div 
                key={bg} 
                className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${colorClass}`}
              >
                <span className="text-2xl mb-1">ðŸ©¸</span>
                <span className="font-black text-text text-lg">{bg}</span>
                <span className="text-[10px] font-black tracking-wider uppercase mt-2">{status}</span>
                <span className="text-text-3 text-[10px] mt-0.5">{count} available</span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="border-t border-border mt-16 pt-10 pb-6 text-xs text-text-2 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="text-vital text-lg">ðŸ©¸</span>
            <span className="font-bold text-white uppercase tracking-wider">Bloodline Grid</span>
          </div>

          <div className="flex flex-wrap gap-4 text-center justify-center font-semibold">
            <Link href="/about" className="hover:text-white transition-all">About</Link>
            <span>â€¢</span>
            <Link href="/" className="hover:text-white transition-all">Privacy Policy</Link>
            <span>â€¢</span>
            <Link href="/" className="hover:text-white transition-all">Terms of Service</Link>
          </div>

          <span className="font-extrabold text-vital flex items-center gap-1">
            <Phone className="h-4 w-4" /> EMERGENCY HELPLINE: +91 11-4567-8910
          </span>
        </div>
      </footer>

    </main>
  );
}
