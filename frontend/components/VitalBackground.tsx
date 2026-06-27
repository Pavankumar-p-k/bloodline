"use client";

import React from "react";

export default function VitalBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 animate-bg-breathe"
      style={{
        background:
          "radial-gradient(circle at var(--gradient-x, 10%) var(--gradient-y, 90%), rgba(232, 25, 44, 0.08) 0%, rgba(6, 6, 8, 1) 60%)",
        transition: "background 2s ease-in-out",
      }}
      aria-hidden="true"
    />
  );
}
