"use client"
import React, { useEffect, useRef, useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { supabase } from "../lib/supabaseClient"

interface Position {
  latitude: number
  longitude: number
  accuracy: number | null
}

interface NearbyUser {
  user_id: string
  latitude: number
  longitude: number
  accuracy: number | null
  updated_at: string
  profile?: {
    email?: string
    name?: string
    role?: string
    blood_group?: string
    phone?: string
  }
}

const DonorMap = dynamic(() => import("./DonorMap"), { ssr: false })

function useMandatoryLocation() {
  const [currentPos, setCurrentPos] = useState<Position | null>(null)
  const [error, setError] = useState<string | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastPosRef = useRef<Position | null>(null)

  const updateLocation = useCallback(async (pos: Position) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("user_locations").upsert(
      {
        user_id: user.id,
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
  }, [])

  const removeLocation = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from("user_locations").delete().eq("user_id", user.id)
  }, [])

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation is not available in this browser")
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: Position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
        lastPosRef.current = p
        setCurrentPos(p)
        updateLocation(p)
      },
      (err) => {
        setError("Unable to get position: " + err.message)
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )

    const wid = navigator.geolocation.watchPosition(
      (pos) => {
        const p: Position = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }
        lastPosRef.current = p
        setCurrentPos(p)
      },
      (err) => {
        console.error("watchPosition error:", err)
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 30000 }
    )
    watchIdRef.current = wid

    const iv = setInterval(() => {
      if (lastPosRef.current) {
        updateLocation(lastPosRef.current)
      }
    }, 15000)
    intervalRef.current = iv

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current)
      }
      removeLocation()
    }
  }, [updateLocation, removeLocation])

  return { currentPos, error }
}

export default function LiveLocationSharing() {
  const { currentPos, error } = useMandatoryLocation()
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([])
  const [showNearby, setShowNearby] = useState(false)
  const mapKey = useRef(0)

  const fetchNearby = useCallback(async () => {
    if (!currentPos) return
    const radius = 0.5
    const { data: { user: me } } = await supabase.auth.getUser()

    const { data } = await supabase
      .from("user_locations")
      .select(`
        user_id,
        latitude,
        longitude,
        accuracy,
        updated_at,
        profile:profiles!user_id(email, name, role, blood_group, phone)
      `)
      .gte("latitude", currentPos.latitude - radius)
      .lte("latitude", currentPos.latitude + radius)
      .gte("longitude", currentPos.longitude - radius)
      .lte("longitude", currentPos.longitude + radius)
      .neq("user_id", me?.id)
      .limit(50)

    if (data) {
      setNearbyUsers(data as unknown as NearbyUser[])
    }
  }, [currentPos])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 border rounded bg-white">
        <div>
          <div className="font-medium flex items-center gap-2">
            Live Location
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse inline-block" title="Location sharing active" />
            <span className="text-xs font-normal text-green-700">Mandatory — always on</span>
          </div>
          <div className="text-xs text-gray-500">
            {error ? (
              <span className="text-red-500">{error}</span>
            ) : currentPos ? (
              `${currentPos.latitude.toFixed(4)}, ${currentPos.longitude.toFixed(4)}`
            ) : (
              "Acquiring position..."
            )}
          </div>
        </div>
      </div>

      {currentPos && (
        <button
          onClick={() => {
            if (!showNearby) {
            mapKey.current += 1
            fetchNearby()
          }
          setShowNearby((v) => !v)
          }}
          className="w-full px-3 py-2 border rounded text-sm bg-white hover:bg-gray-50 transition-colors"
        >
          {showNearby ? "Hide nearby map" : "Show nearby donors on map"}
        </button>
      )}

      {showNearby && currentPos && (
        <div className="rounded-lg overflow-hidden border">
          <DonorMap
            key={mapKey.current}
            center={[currentPos.latitude, currentPos.longitude]}
            users={nearbyUsers}
          />
        </div>
      )}
    </div>
  )
}
