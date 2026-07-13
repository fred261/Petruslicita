import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          50: "#FBF6E9",
          100: "#F6EBCE",
          200: "#EDD79C",
          300: "#E3C26A",
          400: "#D4AC42",
          500: "#B8860B", // âmbar escuro — cor de destaque principal
          600: "#9A6F09",
          700: "#7A5807",
          800: "#5C4205",
          900: "#3D2C04",
        },
        ink: {
          50: "#F7F7F8",
          100: "#EDEEF0",
          300: "#B7BAC1",
          500: "#6B707B",
          700: "#3A3D45",
          900: "#1B1D22", // texto principal
        },
      },
      backgroundImage: {
        "gold-gradient": "linear-gradient(135deg, #9A6F09 0%, #E3C26A 100%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
