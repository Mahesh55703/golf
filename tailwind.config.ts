import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { fairway: { 50: "#f1f6f0", 100: "#e2ecdf", 600: "#2e6747", 700: "#24563a", 800: "#1b422d", 900: "#153523" } } } },
  plugins: [],
};
export default config;
