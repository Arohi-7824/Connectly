/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0d0d14",
        surface: "#13131f",
        card: "#1a1a2e",
        border: "#ffffff14",
        cyan: "#00c8ff",
        purple: "#7c3aed",
        muted: "#8888aa",
        danger: "#ff4d6d",
      },
    },
  },
  plugins: [],
};