import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "bg-base": "#0f0f0f",
        "bg-surface": "#1a1a1a",
        "bg-card": "#222222",
        "accent-orange": "#ff6a00",
        "accent-gold": "#c9a84c",
        "text-primary": "#f5f0e8",
        "text-muted": "#888888",
        border: "#333333",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        ember: "0 0 20px rgba(255, 106, 0, 0.3)",
        "ember-lg": "0 0 40px rgba(255, 106, 0, 0.4)",
        gold: "0 0 20px rgba(201, 168, 76, 0.3)",
      },
      backgroundImage: {
        "fire-gradient":
          "linear-gradient(135deg, #ff6a00 0%, #c9a84c 50%, #ff6a00 100%)",
        "dark-gradient": "linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%)",
        "torch-divider":
          "linear-gradient(90deg, transparent 0%, #ff6a00 50%, transparent 100%)",
      },
      animation: {
        ember: "ember 3s ease-in-out infinite",
        "pulse-orange": "pulse-orange 2s ease-in-out infinite",
      },
      keyframes: {
        ember: {
          "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.02)" },
        },
        "pulse-orange": {
          "0%, 100%": { boxShadow: "0 0 10px rgba(255, 106, 0, 0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(255, 106, 0, 0.5)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
