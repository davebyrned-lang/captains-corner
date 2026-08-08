import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sampled straight from the FPL Corner logo.
        ink: "#000215",      // page background, the logo's own backdrop
        pitch: "#0A0C24",    // raised panels
        slate1: "#131634",   // cards, picking up the shield's purple
        mint: "#BAED48",     // primary accent, the lime in the wordmark
        teal: "#2BF0E8",     // secondary accent, the robot's eyes
        green: "#79B043",    // tertiary
        chalk: "#E9F2E4",    // body text
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
