const defaultTheme = require("tailwindcss/defaultTheme");

module.exports = {
  content: ["./app/**/*.{ts,tsx,js,jsx}", "./components/**/*.{ts,tsx,js,jsx}", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: "#060608",
        surface: "#0E0E12",
        "surface-2": "#16161C",
        border: "#1E1E28",
        "border-2": "#2A2A38",
        vital: "#E8192C",
        "vital-dim": "rgba(232,25,44,0.09)",
        "vital-mid": "rgba(232,25,44,0.25)",
        pulse: "#FF4458",
        confirmed: "#00D084",
        warning: "#F0A500",
        critical: "#FF3B3B",
        text: "#F0F0F8",
        "text-2": "#8888A8",
        "text-3": "#44445A",
      },
      fontFamily: {
        display: ["Syne", ...defaultTheme.fontFamily.sans],
        body: ["Inter", ...defaultTheme.fontFamily.sans],
        data: ["JetBrains Mono", ...defaultTheme.fontFamily.mono],
      },
      keyframes: {
        "vital-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(232,25,44,0.6)" },
          "50%": { boxShadow: "0 0 0 20px rgba(232,25,44,0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "bg-breathe": {
          "0%, 100%": { "--gradient-x": "10%", "--gradient-y": "90%" },
          "25%": { "--gradient-x": "90%", "--gradient-y": "80%" },
          "50%": { "--gradient-x": "80%", "--gradient-y": "10%" },
          "75%": { "--gradient-x": "20%", "--gradient-y": "20%" },
        },
        "heartbeat-draw": {
          "0%": { strokeDashoffset: "600" },
          "100%": { strokeDashoffset: "0" },
        },
        "heartbeat-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "skeleton-shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        "vital-glow": "0 0 20px rgba(232,25,44,0.2)",
        "confirmed-glow": "0 0 12px rgba(0,208,132,0.06)",
      },
      animation: {
        "vital-pulse": "vital-pulse 1.5s infinite",
        "fade-up": "fade-up 0.2s ease-out",
        "bg-breathe": "bg-breathe 8s ease-in-out infinite",
        "heartbeat-draw": "heartbeat-draw 1.2s ease-out forwards",
        "heartbeat-pulse": "heartbeat-pulse 2s ease-in-out infinite",
        "skeleton-shimmer": "skeleton-shimmer 1.5s linear infinite",
      },
    },
  },
  plugins: [],
};
