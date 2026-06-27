"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useLiveLocation } from "../lib/useLiveLocation";
import { MapPin, Navigation, Loader2 } from "lucide-react";

export default function LiveLocationToggle() {
  const { user, role } = useAuth();
  const [tracking, setTracking] = useState(false);

  useLiveLocation(tracking, user?.id);

  if (role !== "donor") return null;

  return (
    <div className="bg-surface border border-border rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className={`h-5 w-5 ${tracking ? "text-confirmed" : "text-text-3"}`} />
          <div>
            <p className="text-sm font-bold text-text">Live Location Sharing</p>
            <p className="text-[11px] text-text-2">{tracking ? "Donors near you can see you're available" : "Share your location to receive nearby requests"}</p>
          </div>
        </div>
        <button
          onClick={() => setTracking(!tracking)}
          className={`relative w-12 h-6 rounded-full p-0.5 transition-colors ${tracking ? "bg-confirmed" : "bg-surface-2 border border-border"}`}
        >
          <div className={`w-5 h-5 rounded-full bg-white transition-transform ${tracking ? "translate-x-6" : "translate-x-0"}`} />
        </button>
      </div>
      {tracking && (
        <div className="flex items-center gap-2 text-[11px] text-confirmed bg-confirmed/5 border border-confirmed/20 rounded-lg px-3 py-2">
          <Loader2 className="h-3 w-3 animate-spin" />
          Broadcasting location every 15s
        </div>
      )}
      <p className="text-[10px] text-text-3">Your location is only shared while you are available and will stop when you toggle off.</p>
    </div>
  );
}
