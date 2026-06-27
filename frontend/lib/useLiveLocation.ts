"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

const UPDATE_INTERVAL = 15000;
const HEARTBEAT_INTERVAL = 30000;

export function useLiveLocation(enabled: boolean, userId?: string) {
  const watchIdRef = useRef<number | null>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  const upsertLocation = useCallback(async (lat: number, lng: number) => {
    if (!userId) return;
    try {
      await supabase.from("donor_live_locations").upsert(
        { donor_id: userId, lat, lng, last_updated: new Date().toISOString() },
        { onConflict: "donor_id" }
      );
    } catch {
      // silently fail
    }
  }, [userId]);

  const heartbeat = useCallback(async () => {
    if (!userId) return;
    try {
      await supabase.from("donor_live_locations").upsert(
        { donor_id: userId, last_updated: new Date().toISOString() },
        { onConflict: "donor_id" }
      );
    } catch {
      // silently fail
    }
  }, [userId]);

  const start = useCallback(() => {
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        lastPositionRef.current = { lat, lng };
        upsertLocation(lat, lng);
      },
      (err) => console.warn("Live location error:", err.message),
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
  }, [upsertLocation]);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (userId) {
      supabase.from("donor_live_locations").delete().eq("donor_id", userId).then(() => {});
    }
    lastPositionRef.current = null;
  }, [userId]);

  useEffect(() => {
    if (enabled && userId) {
      start();
      const heartbeatTimer = setInterval(heartbeat, HEARTBEAT_INTERVAL);
      return () => {
        stop();
        clearInterval(heartbeatTimer);
      };
    }
  }, [enabled, userId, start, stop, heartbeat]);

  return { stop };
}
