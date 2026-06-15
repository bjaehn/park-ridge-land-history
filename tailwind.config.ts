import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand / structural
        surface: {
          base: "#0f0f13",
          raised: "#18181f",
          card: "#1e1e28",
          border: "#2a2a38",
        },
        // Text
        text: {
          primary: "#f0eef8",
          secondary: "#9896b0",
          muted: "#5c5a72",
          link: "#8b7ff0",
        },
        // Accent
        accent: {
          purple: "#8b7ff0",
          teal: "#4fb6a8",
          amber: "#e6a64a",
          red: "#c96a70",
        },
        // Era decade palette (matches colorScales.ts)
        era: {
          "pre1900": "#4c3b4d",
          "1900s": "#6b4e71",
          "1910s": "#785f9a",
          "1920s": "#6d7eb8",
          "1930s": "#4f9db8",
          "1940s": "#4fb6a8",
          "1950s": "#68bd7d",
          "1960s": "#9ac35d",
          "1970s": "#d0bd4d",
          "1980s": "#e6a64a",
          "1990s": "#df8252",
          "2000s": "#c96a70",
          "2010s": "#a85f84",
          "2020s": "#6d617c",
          "unknown": "#9ca3af",
        },
        // Confidence signals
        confidence: {
          high: "#4fb6a8",
          medium: "#e6a64a",
          low: "#c96a70",
          unknown: "#9ca3af",
        },
        // Change signals
        signal: {
          dormant: "#9ca3af",
          reinvestment: "#4fb6a8",
          turnover: "#e6a64a",
          rebuild: "#c96a70",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      spacing: {
        "page-x": "clamp(1rem, 4vw, 3rem)",
      },
      maxWidth: {
        content: "1280px",
        prose: "72ch",
      },
      screens: {
        sm: "480px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
  },
  plugins: [],
};

export default config;
