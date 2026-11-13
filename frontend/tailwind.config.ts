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
        sans: ["var(--game-font-ui)", "'Plus Jakarta Sans'", "sans-serif"],
        game: ["var(--game-font)", "'Plus Jakarta Sans'", "sans-serif"],
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
          elixir: "#D94680",
          darkElixir: "#524136",
          shiny: "#38BDF8",
          glowy: "#E06D3B",
          starry: "#F59E0B",
          accent: "#D97706",
        },
      },
      boxShadow: {
        elevation: "0 4px 16px -2px rgba(42, 30, 18, 0.08), 0 2px 6px -1px rgba(42, 30, 18, 0.05)",
        elevationDark: "0 8px 24px -4px rgba(14, 10, 6, 0.45), 0 2px 8px -2px rgba(14, 10, 6, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
