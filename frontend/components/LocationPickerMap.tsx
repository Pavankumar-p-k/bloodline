"use client";
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

const markerIcon = L.divIcon({
  className: "",
  html: `<div style="background:#C41E3A;color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 0 10px rgba(196,30,58,0.8)" class="animate-bounce">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

// Update map center dynamically when props change
function ChangeMapView({ coords }: { coords: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(coords, map.getZoom());
  }, [coords, map]);
  return null;
}

// Handle map click events
function MapClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPickerMap({ lat, lng, onChange }: LocationPickerMapProps) {
  const position: [number, number] = [lat, lng];

  return (
    <div className="w-full h-64 rounded-xl overflow-hidden border border-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
      <MapContainer
        center={position}
        zoom={13}
        className="w-full h-full"
        style={{ background: "#1F1F1F" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ChangeMapView coords={position} />
        <MapClickHandler onChange={onChange} />
        <Marker position={position} icon={markerIcon} />
      </MapContainer>
    </div>
  );
}
