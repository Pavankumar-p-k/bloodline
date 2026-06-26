"use client"
import React from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

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

interface DonorMapProps {
  center: [number, number]
  users: NearbyUser[]
}

const userIcon = L.divIcon({
  className: "",
  html: `<div style="background:#e11d48;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3)">D</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -14],
})

const youIcon = L.divIcon({
  className: "",
  html: `<div style="background:#2563eb;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.4)">You</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
})

function MapBounds({ users, center }: { users: NearbyUser[]; center: [number, number] }) {
  const map = useMap()
  React.useEffect(() => {
    if (users.length === 0) {
      map.setView(center, 13)
      return
    }
    const bounds = L.latLngBounds(
      users.map((u) => [u.latitude, u.longitude] as [number, number])
    )
    bounds.extend(center)
    map.fitBounds(bounds, { padding: [50, 50] })
  }, [users, center, map])
  return null
}

export default function DonorMap({ center, users }: DonorMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={13}
      className="h-80 w-full"
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <MapBounds users={users} center={center} />

      <Marker position={center} icon={youIcon}>
        <Popup>
          <div className="text-sm font-medium">Your location</div>
        </Popup>
      </Marker>

      {users.map((u) => (
        <Marker
          key={u.user_id}
          position={[u.latitude, u.longitude]}
          icon={userIcon}
        >
          <Popup>
            <div className="text-sm space-y-1">
              <div className="font-semibold">
                {u.profile?.name || u.profile?.email || "Unknown"}
              </div>
              {u.profile?.blood_group && (
                <div>
                  Blood: <span className="font-semibold text-rose-600">{u.profile.blood_group}</span>
                </div>
              )}
              {u.profile?.phone && <div>Phone: {u.profile.phone}</div>}
              {u.profile?.role && <div className="capitalize">Role: {u.profile.role}</div>}
              <div className="text-gray-400 text-xs">
                Updated {new Date(u.updated_at).toLocaleTimeString()}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
