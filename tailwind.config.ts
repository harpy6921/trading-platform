import type { Config } from "tailwindcss";

// Design tokens for the "Terminal" visual system.
// Grounding: an amber-phosphor trading-desk aesthetic — deep near-black
// navy panels, hairline borders, monospace data, amber as the single
// interactive accent, with green/red reserved strictly for price direction
// (a functional convention, not decoration).
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          950: "#05070A", // page background
          900: "#0A0E14", // app shell
          800: "#0F141C", // panel surface
          700: "#161C26", // raised surface / hover
          600: "#1E2530", // hairline borders
          500: "#2A3341", // stronger borders / dividers
        },
        ink: {
          100: "#F3F5F8", // primary text
          300: "#C3C9D4", // secondary text
          500: "#8B93A3", // tertiary / labels
          700: "#5B6274", // disabled / faint
        },
        amber: {
          DEFAULT: "#E8A33D",
          bright: "#FFC968",
          dim: "#8A6321",
        },
        rise: {
          DEFAULT: "#2FD48C",
          dim: "#173F2F",
        },
        fall: {
          DEFAULT: "#FF5C6C",
          dim: "#3F1B21",
        },
        signal: {
          strongbuy: "#2FD48C",
          buy: "#7FE0AE",
          hold: "#8B93A3",
          sell: "#FF9A7A",
          strongsell: "#FF5C6C",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 8px 24px -12px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(232,163,61,0.25), 0 0 24px -4px rgba(232,163,61,0.35)",
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgba(232,163,61,0.06), transparent 60%)",
      },
      animation: {
        ticker: "ticker 38s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
