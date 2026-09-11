import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f6fe",
          100: "#e0eefe",
          200: "#bae0fd",
          300: "#7cc7fb",
          400: "#38bdf8",
          500: "#0284c7",
          600: "#0369a1",
          700: "#075985",
          800: "#0c4a6e",
          900: "#0b192c",
          950: "#07101e",
        },
      },
      boxShadow: {
        "2xs": "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      },
    },
  },
  plugins: [],
};
export default config;
