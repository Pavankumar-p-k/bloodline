"use client";

import React, { useEffect, useRef } from "react";

type Props = {
  width?: number;
  height?: number;
  color?: string;
  className?: string;
};

export default function HeartbeatLine({
  width = 600,
  height = 60,
  color = "var(--vital, #E8192C)",
  className = "",
}: Props) {
  const pathRef = useRef<SVGPathElement>(null);
  const [drawn, setDrawn] = React.useState(false);

  useEffect(() => {
    const path = pathRef.current;
    if (!path) return;
    const length = path.getTotalLength();
    path.style.strokeDasharray = String(length);
    path.style.strokeDashoffset = String(length);

    const handle = requestAnimationFrame(() => {
      path.style.transition = "stroke-dashoffset 1.2s ease-out";
      path.style.strokeDashoffset = "0";
    });

    const timer = setTimeout(() => {
      setDrawn(true);
    }, 1400);

    return () => {
      cancelAnimationFrame(handle);
      clearTimeout(timer);
    };
  }, []);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 600 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Heartbeat line"
    >
      <path
        ref={pathRef}
        d="M0 30 L100 30 L120 30 L140 30 L145 30 L150 30 L155 30 L160 10 L165 50 L170 25 L180 25 L190 25 L200 30 L220 30 L240 30 L260 30 L280 30 L300 30 L320 30 L340 30 L360 30 L380 30 L400 30 L420 30 L440 30 L460 30 L480 30 L500 30 L520 30 L540 30 L560 30 L600 30"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className={drawn ? "animate-heartbeat-done" : ""}
        style={
          drawn
            ? {}
            : {
                strokeDasharray: "600",
                strokeDashoffset: "600",
                transition: "stroke-dashoffset 1.2s ease-out",
              }
        }
      />
    </svg>
  );
}
