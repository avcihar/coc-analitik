import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        game: ["var(--game-font)", "'Lilita One'", "sans-serif"],
      },
      colors: {
        // Theme-aware tokens
        app: {
          bg: "var(--app-bg)",
          card: "var(--app-card)",
          cardSubtle: "var(--app-card-subtle)",
          border: "var(--app-border)",
          borderStrong: "var(--app-border-strong)",
          text: "var(--app-text)",
          muted: "var(--app-muted)",
        },
        coc: {
          gold: "#F59E0B",
          elixir: "#EC4899",
          darkElixir: "#6366F1",
          shiny: "#10B981",    // Shiny ore emerald
          glowy: "#0EA5E9",    // Glowy ore cyan
          starry: "#A855F7",   // Starry ore purple
          accent: "#3B82F6",   // Primary action blue
        },
      },
      boxShadow: {
        elevation: "0 4px 16px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.05)",
        elevationDark: "0 8px 24px -4px rgba(10, 15, 25, 0.4), 0 2px 8px -2px rgba(10, 15, 25, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
