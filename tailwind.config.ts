import type { Config } from "tailwindcss";

/**
 * LÉVANCE centralized design tokens.
 *
 * This file — together with app/globals.css — is the single source of
 * truth for the visual system. Components must reference these tokens
 * (via Tailwind classes) rather than hard-coding hex values, so the
 * brand can be adjusted in one place.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          DEFAULT: "#0A0A0B",
          soft: "#121214",
          raised: "#18181B",
        },
        ivory: {
          DEFAULT: "#FAF9F6",
          muted: "#F1EFEA",
        },
        champagne: {
          DEFAULT: "#C8A96A",
          soft: "#DCC79A",
          line: "#8A7647",
        },
        neutral: {
          50: "#FAFAF9",
          100: "#F1EFEA",
          200: "#E4E1D9",
          300: "#CFCBC0",
          400: "#A6A196",
          500: "#7A756A",
          600: "#57534A",
          700: "#3D3A33",
          800: "#26241F",
          900: "#151412",
        },
        success: "#5C7A5C",
        warning: "#B08A3E",
        danger: "#A6473A",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest2: "0.28em",
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,10,11,0.04), 0 8px 24px rgba(10,10,11,0.06)",
        raised: "0 2px 4px rgba(10,10,11,0.06), 0 16px 40px rgba(10,10,11,0.10)",
      },
      transitionTimingFunction: {
        signature: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      maxWidth: {
        content: "1440px",
      },
    },
  },
  plugins: [],
};

export default config;
