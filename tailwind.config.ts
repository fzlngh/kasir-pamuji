import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neumorphic base — one soft cool-gray surface everything sits on.
        neu: {
          bg: "#E6E9EF",
          light: "#FFFFFF",
          dark: "#AEB8CC",
          text: "#3E4653",
          muted: "#8A93A6",
          accent: "#3EB489",
          "accent-dark": "#2E9B72",
          danger: "#E1596F",
          "danger-dark": "#C64258",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
