/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#CC3333", light: "#E55555", dark: "#A32A2A" },
        accent: { DEFAULT: "#10b981", light: "#34d399" },
        surface: { DEFAULT: "#0D1520", light: "#141F2E" },
        aur: {
          navy: "#0D2137",
          navyDark: "#081420",
          navyLight: "#1B3A5C",
          red: "#CC3333",
          redDark: "#A32A2A",
          redLight: "#E55555",
          white: "#FFFFFF",
          bg: "#081420",
          border: "#1B3A5C",
          card: "#0D1520",
          cardLight: "#0F2535",
        }
      },
    },
  },
  plugins: [],
};
