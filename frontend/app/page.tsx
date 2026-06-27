"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { Heart, ArrowRight, ShieldAlert, MapPin, Phone, Droplets } from "lucide-react";
import VitalBackground from "../components/VitalBackground";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

export default function HomePage() {
  const [totalDonors, setTotalDonors] = useState(6);
  const [fulfilledToday, setFulfilledToday] = useState(1);
  const [livesImpacted, setLivesImpacted] = useState(3);
  const [tickerRequests, setTickerRequests] = useState<any[]>([]);
  const [donorsList, setDonorsList] = useState<any[]>([]);

  const fetchLandingData = async () => {
    try {
      const { count: donorsCount } = await supabase
        .from("donors")
        .select("id", { count: "exact", head: true });
      if (donorsCount !== null) setTotalDonors(donorsCount);

      const { count: fulfilledCount } = await supabase
        .from("blood_requests")
        .select("id", { count: "exact", head: true })
        .eq("status", "fulfilled");
      if (fulfilledCount !== null) {
        setFulfilledToday(fulfilledCount);
        setLivesImpacted(fulfilledCount * 3);
      }

      const { data: activeReqs } = await supabase
        .from("blood_requests")
        .select("blood_group_needed,city,urgency_level")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);
      setTickerRequests(activeReqs || []);

      const { data: donors } = await supabase
        .from("donors")
        .select("blood_group,is_available");
      setDonorsList(donors || []);
    } catch {
      console.warn("Using mock seeds");
    }
  };

  useEffect(() => {
    fetchLandingData();
    const homeChannel = supabase
      .channel("home-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "blood_requests" }, () => fetchLandingData())
      .on("postgres_changes", { event: "*", schema: "public", table: "donors" }, () => fetchLandingData())
      .subscribe();
    return () => { supabase.removeChannel(homeChannel); };
  }, []);

  const getBloodStatus = (bg: string) => {
    const count = donorsList.filter(d => d.blood_group === bg && d.is_available).length;
    if (count >= 3) return { count, label: "STABLE", color: "confirmed" as const };
    if (count > 0) return { count, label: "LOW", color: "warning" as const };
    return { count, label: "CRITICAL", color: "vital" as const };
  };

  return (
    <>
      <VitalBackground />
      <main className="text-text overflow-hidden pb-12">

        {/* Urgency Ticker */}
        {tickerRequests.length > 0 && (
          <div className="bg-vital-dim border-b border-vital-dim py-2.5 overflow-hidden text-xs">
            <div className="flex gap-8 animate-[marquee_25s_linear_infinite] whitespace-nowrap items-center">
              {Array(3).fill(tickerRequests).flat().map((req, idx) => (
                <div key={idx} className="inline-flex items-center gap-2 text-text">
                  <span className="w-1.5 h-1.5 rounded-full bg-vital animate-ping" />
                  <span className="font-extrabold text-vital">{req.blood_group_needed}</span> REQUIRED IN
                  <span className="font-semibold text-text uppercase">{req.city}</span>
                  <span className="px-1 py-0.5 rounded text-[8px] font-black bg-vital/10 border border-vital-dim text-vital">
                    {req.urgency_level}
                  </span>
                  <span className="mx-4 text-text-3">|</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hero */}
        <section className="relative max-w-6xl mx-auto px-4 pt-16 pb-12 sm:pt-20 sm:pb-16 flex flex-col items-center text-center space-y-8 animate-fade-up">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-24 h-24 bg-vital/20 rounded-full blur-2xl animate-vital-pulse" />
            <svg className="w-20 h-28 drop-shadow-[0_0_15px_rgba(232,25,44,0.5)] transform hover:scale-105 transition-transform duration-300 cursor-pointer" viewBox="0 0 100 150">
              <defs>
                <radialGradient id="dropGrad" cx="40%" cy="30%">
                  <stop offset="0%" stopColor="#ff3b4a" />
                  <stop offset="100%" stopColor="#E8192C" />
                </radialGradient>
              </defs>
              <path d="M50,0 C50,0 10,70 10,105 A40,40 0 0,0 90,105 C90,70 50,0 50,0 Z" fill="url(#dropGrad)"
                className="animate-[pulseDrop_4s_ease-in-out_infinite] origin-[50%_70%]" />
            </svg>
          </div>

          <div className="space-y-4 max-w-3xl">
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight text-text">
              Your blood. <br className="sm:hidden" />
              <span className="text-vital">Someone&apos;s tomorrow.</span>
            </h1>
            <p className="text-sm sm:text-lg text-text-2 max-w-xl mx-auto font-medium">
              India&apos;s production-grade blood donation grid. Connect donors to emergency patients in real time.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4 justify-center">
            <Link href="/auth/signup" className="w-full sm:w-56">
              <button className="w-full px-6 py-4 rounded-xl bg-vital hover:brightness-90 text-white font-bold transition-all shadow-vital-glow hover:shadow-vital-glow flex items-center justify-center gap-2">
                I Want To Donate <ArrowRight className="h-4.5 w-4.5" />
              </button>
            </Link>
            <Link href="/emergency" className="w-full sm:w-56">
              <button className="w-full px-6 py-4 rounded-xl bg-surface hover:bg-surface-2 text-text font-bold border border-border hover:border-border-2 transition-all flex items-center justify-center gap-2">
                I Need Blood Now <ShieldAlert className="h-4.5 w-4.5 text-vital" />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6 sm:gap-12 bg-surface p-6 rounded-2xl border border-border max-w-2xl w-full mt-10">
            {[
              { value: totalDonors, label: "Active Donors", color: "text-vital" },
              { value: fulfilledToday, label: "Fulfilled Today", color: "text-text" },
              { value: livesImpacted, label: "Lives Saved", color: "text-confirmed" },
            ].map((stat, i) => (
              <React.Fragment key={stat.label}>
                {i > 0 && <div className="border-l border-border" />}
                <div className="text-center">
                  <span className={`block text-2xl sm:text-3xl font-black tracking-tight ${stat.color}`}>{stat.value}</span>
                  <span className="text-[10px] font-extrabold text-text-2 uppercase tracking-wider mt-1 block">{stat.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border py-8 px-4 mt-8">
          <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { label: "Donors Registered", value: "10,000+ Nationally" },
              { label: "Requests Dispatched", value: "4,200 Cases" },
              { label: "Cities Covered", value: "48 Metro Hubs" },
              { label: "Avg Response Time", value: "14.8 Minutes", color: "text-confirmed" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <span className="text-[10px] font-bold text-text-2 uppercase tracking-widest block">{s.label}</span>
                <span className={`text-xl font-bold text-text mt-1.5 block ${s.color || ""}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-6xl mx-auto px-4 py-16 space-y-12">
          <div className="text-center space-y-2 animate-fade-up">
            <h2 className="text-3xl font-extrabold text-text">How It Works</h2>
            <p className="text-sm text-text-2">Dual-pipeline coordination for absolute speed</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                title: "For Donors",
                accent: "text-confirmed",
                steps: [
                  "Register: Provide your health metadata, weight, and blood group details.",
                  "Pick Location: Drag pins to mark coordinates without disclosing exact address.",
                  "Respond: Receive notifications for nearby critical demands and confirm route travel.",
                ],
              },
              {
                title: "For Requesters",
                accent: "text-vital",
                steps: [
                  "Request: Set blood type, units, and drop coordinates where bags are needed.",
                  "Verify: Upload letters or slips and verify contact numbers via SMS OTP.",
                  "Track Live: Check confirmations and coordination numbers in real time.",
                ],
              },
            ].map((section) => (
              <div key={section.title} className="bg-surface p-6 sm:p-8 rounded-2xl border border-border space-y-6">
                <h3 className={`text-lg font-black text-text flex items-center gap-2 border-b border-border pb-3 ${section.accent}`}>
                  <Droplets className="h-5 w-5" /> {section.title}
                </h3>
                <div className="space-y-4">
                  {section.steps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-6 h-6 rounded-full bg-surface-2 text-text font-bold flex items-center justify-center text-xs flex-shrink-0">{i + 1}</div>
                      <p className="text-xs text-text-2"><span className="text-text font-semibold">{step.split(":")[0]}:</span>{step.slice(step.indexOf(":") + 1)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Blood Availability Grid */}
        <section className="max-w-6xl mx-auto px-4 py-8 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-text">Grid Status Monitor</h2>
            <p className="text-xs text-text-2">Real-time donor counts matching universal and secondary groups</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {BLOOD_GROUPS.map((bg) => {
              const { count, label, color } = getBloodStatus(bg);
              const colorMap = { vital: "bg-vital-dim border-vital-dim text-vital", warning: "bg-warning/5 border-warning/20 text-warning", confirmed: "bg-confirmed/5 border-confirmed/20 text-confirmed" };
              return (
                <div key={bg} className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all ${colorMap[color]}`}>
                  <Droplets className="h-6 w-6 mb-1" />
                  <span className="font-black text-text text-lg">{bg}</span>
                  <span className="text-[10px] font-black tracking-wider uppercase mt-2">{label}</span>
                  <span className="text-text-3 text-[10px] mt-0.5">{count} available</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border mt-16 pt-10 pb-6 text-xs text-text-2 px-4">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-vital" />
              <span className="font-bold text-text uppercase tracking-wider">BloodLine Grid</span>
            </div>
            <div className="flex flex-wrap gap-4 text-center justify-center font-semibold">
              <Link href="/about" className="hover:text-text transition-all">About</Link>
              <span className="text-text-3">/</span>
              <Link href="/" className="hover:text-text transition-all">Privacy Policy</Link>
              <span className="text-text-3">/</span>
              <Link href="/" className="hover:text-text transition-all">Terms of Service</Link>
            </div>
            <span className="font-extrabold text-vital flex items-center gap-1">
              <Phone className="h-4 w-4" /> EMERGENCY HELPLINE: +91 11-4567-8910
            </span>
          </div>
        </footer>

        <style>{`
          @keyframes pulseDrop { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05) translateY(-2px); } }
          @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        `}</style>
      </main>
    </>
  );
}
