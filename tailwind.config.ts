import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        cockpit: {
          navy: "#09233f",
          panel: "#f7f9fb",
          line: "#d8e2ec",
          blue: "#1769aa",
          amber: "#b7791f",
          green: "#2f855a"
        }
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
