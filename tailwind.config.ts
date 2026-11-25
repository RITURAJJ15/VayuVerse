import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Design D — Soft Swiss Minimalism exact palette
        swiss: {
          bg: "#FAFAF7",
          sage: "#EAF1E9",
          softgreen: "#AFC8B5",
          "softgreen-dark": "#98B59E",
          ink: "#182323",
          "ink-muted": "#526161",
          "ink-faint": "#8C9B9B",
          border: "#DCE2DC",
          "border-subtle": "#EBEFEB",
          card: "#FFFFFF",
        },
        // Semantic design tokens
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Indian NAQI semantic colors (refined for soft palette)
        aqi: {
          good: "#2E7D4E",
          satisfactory: "#5A8B35",
          moderate: "#B8860B",
          poor: "#C65D28",
          "very-poor": "#B93838",
          severe: "#731E1E",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "'Plus Jakarta Sans'",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        serif: [
          "'Newsreader'",
          "'Instrument Serif'",
          "Georgia",
          "serif",
        ],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(3px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "breathe": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.25s ease-out",
        "breathe": "breathe 3.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
