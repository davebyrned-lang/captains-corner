import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sampled straight from the Assistant Manager logo.
        ink: "#010413",      // page background, the logo's own backdrop
        pitch: "#061024",    // raised panels
        slate1: "#0C1730",   // cards
        mint: "#C5E659",     // primary accent, the lime in the wordmark
        teal: "#20A685",     // secondary accent
        green: "#3FA974",    // tertiary
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
