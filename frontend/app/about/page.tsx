"use client";

import React from "react";
import { Heart, ShieldCheck, Clock, Map } from "lucide-react";

export default function AboutPage() {
  return (
    <main className="min-h-[85vh] bg-[#0A0A0A] text-[#F5F5F5] py-12 px-6">
      <div className="mx-auto max-w-4xl space-y-10">
        
        {/* Header */}
        <div className="border-b border-zinc-800 pb-6">
          <span className="text-xs font-semibold text-[#C41E3A] uppercase tracking-widest block">About the platform</span>
          <h1 className="text-4xl font-black text-white mt-1">Our Mission & Design</h1>
        </div>

        {/* Introduction */}
        <div className="bg-[#1A1A1A] border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-4">
          <p className="text-zinc-200 text-base sm:text-lg leading-relaxed">
            <span className="text-white font-extrabold text-lg">Bloodline</span> is a health logistics network designed to save lives by matching active blood donors directly to hospitals and patient families in real time during critical emergencies.
          </p>
          <p className="text-xs text-[#9090A0] leading-relaxed">
            In times of critical surgery or severe medical conditions, every second count. By mapping donors, tracking locations anonymously, and executing intelligent compatibility filters, we bypass manual searching and establish direct lines of support.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#1A1A1A] border border-zinc-800 p-5 rounded-xl space-y-2">
            <Heart className="h-6 w-6 text-[#C41E3A]" />
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Algorithmic Matching</h3>
            <p className="text-xs text-[#9090A0]">Matches compatible blood groups (including O- universal falls) within the donor's exact travel limits.</p>
          </div>

          <div className="bg-[#1A1A1A] border border-zinc-800 p-5 rounded-xl space-y-2">
            <Clock className="h-6 w-6 text-[#C41E3A]" />
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Immediate Dispatch</h3>
            <p className="text-xs text-[#9090A0]">Dispatches automated notifications and lists matching emergency request pins on a live map within seconds.</p>
          </div>

          <div className="bg-[#1A1A1A] border border-zinc-800 p-5 rounded-xl space-y-2">
            <ShieldCheck className="h-6 w-6 text-[#C41E3A]" />
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Privacy & Trust</h3>
            <p className="text-xs text-[#9090A0]">Hides exact donor coordinates, showing only city-level areas. Contact info is revealed only after donor confirmation.</p>
          </div>

          <div className="bg-[#1A1A1A] border border-zinc-800 p-5 rounded-xl space-y-2">
            <Map className="h-6 w-6 text-[#C41E3A]" />
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Hospital Command</h3>
            <p className="text-xs text-[#9090A0]">Allows coordinators to upload verification slips, audit queues, and monitor active en-route travel ETAs.</p>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center pt-6 text-xs text-zinc-500 font-semibold border-t border-zinc-850">
          © 2026 Bloodline Network. Registered Health Service. National Emergency: +91 11-4567-8910.
        </div>

      </div>
    </main>
  );
}
