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
        heading: ["var(--font-cinzel)", "Cinzel", "serif"],
        logo: ["var(--font-cinzel-deco)", "serif"],
        stats: ["var(--font-bebas)", "sans-serif"],
        body: ["var(--font-crimson)", "Georgia", "serif"],
      },
      boxShadow: {
        ember: "0 0 20px rgba(255, 106, 0, 0.3)",
        "ember-lg": "0 0 40px rgba(255, 106, 0, 0.4)",
        gold: "0 0 20px rgba(201, 168, 76, 0.3)",
        "inner-ember": "inset 0 0 20px rgba(255, 106, 0, 0.08)",
        "inner-stone": "inset 0 2px 4px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.02)",
      },
      backgroundImage: {
        "fire-gradient":
          "linear-gradient(135deg, #ff6a00 0%, #c9a84c 50%, #ff6a00 100%)",
        "fire-gradient-hover":
          "linear-gradient(315deg, #ff6a00 0%, #c9a84c 50%, #ff6a00 100%)",
        "dark-gradient": "linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%)",
        "torch-divider":
          "linear-gradient(90deg, transparent 0%, #ff6a00 40%, #c9a84c 50%, #ff6a00 60%, transparent 100%)",
      },
      animation: {
        ember: "ember 3s ease-in-out infinite",
        "pulse-orange": "pulse-orange 2s ease-in-out infinite",
        "flame-flicker": "flame-flicker 6s ease-in-out infinite",
        "ember-pulse": "ember-pulse 2s ease-in-out infinite",
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
        "flame-flicker": {
          "0%, 88%, 100%": { filter: "brightness(1)" },
          "90%": { filter: "brightness(1.15) saturate(1.1)" },
          "93%": { filter: "brightness(0.93)" },
          "96%": { filter: "brightness(1.08)" },
          "99%": { filter: "brightness(0.97)" },
        },
        "ember-pulse": {
          "0%, 100%": { opacity: "0.4", transform: "scale(0.95)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
