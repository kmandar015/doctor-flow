import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#123B3D",
        brand: "#18736E",
        mist: "#F6F7FA",
        lavender: "#F3F2FC",
      },
      boxShadow: {
        card: "0 4px 20px rgba(25, 50, 73, 0.055)",
      },
    },
  },
  plugins: [],
};

export default config;
