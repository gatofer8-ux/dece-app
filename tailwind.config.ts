import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#d9e6ff",
          200: "#b3ccff",
          300: "#84acff",
          400: "#5588ff",
          500: "#2f65f5",
          600: "#1f4bd1",
          700: "#1c3ca8",
          800: "#1c3486",
          900: "#1b2f6c",
        },
      },
    },
  },
  plugins: [],
};
export default config;
