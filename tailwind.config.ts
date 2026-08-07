import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211c",
        mist: "#f5f7f2",
        paper: "#ffffff",
        line: "#dfe5dc",
        forest: "#21543f",
        moss: "#6b8e59",
        clay: "#b45c3d",
        sky: "#397aa8",
        gold: "#9b7a2f",
        blush: "#b95f6a"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(23, 33, 28, 0.08)",
        panel: "0 18px 60px rgba(23, 33, 28, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
