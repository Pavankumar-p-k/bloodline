"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Compass } from "lucide-react";

// Dynamically import LiveInteractiveMap with SSR disabled
const LiveInteractiveMap = dynamic(
  () => import("../../components/LiveInteractiveMap"),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full h-[88vh] bg-void flex flex-col items-center justify-center text-text-3 gap-3 border-t border-zinc-900">
        <Compass className="h-10 w-10 text-vital animate-spin" />
        <span className="text-sm font-semibold tracking-wider">Locating user & mounting live network map...</span>
      </div>
    ) 
  }
);

export default function LiveMapPage() {
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        (err) => {
          console.warn("Geolocation permission denied, falling back to Bangalore default.", err);
          // Default Bangalore center fallback
          setUserCoords({ lat: 12.9716, lng: 77.5946 });
        }
      );
    } else {
      // Fallback
      setUserCoords({ lat: 12.9716, lng: 77.5946 });
    }
  }, []);

  if (!userCoords) {
    return (
      <div className="w-full h-[88vh] bg-void flex flex-col items-center justify-center text-text-3 gap-3 border-t border-zinc-900">
        <Compass className="h-10 w-10 text-vital animate-spin" />
        <span className="text-sm font-semibold tracking-wider">Mounting live network map...</span>
      </div>
    );
  }

  return (
    <main className="w-full h-full bg-void">
      <LiveInteractiveMap userLat={userCoords.lat} userLng={userCoords.lng} />
    </main>
  );
}
