import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        leaf: "#2f6f4e",
        petal: "#f8d9cf",
        cream: "#fffaf3"
      },
      boxShadow: {
        soft: "0 18px 55px rgba(31, 41, 51, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
