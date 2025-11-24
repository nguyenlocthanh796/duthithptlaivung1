/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#4285F4", // Gemini Blue
          light: "#5A9AFF",
          dark: "#1A73E8",
        },
        gemini: {
          blue: "#4285F4",
          green: "#34A853",
          yellow: "#FBBC04",
          red: "#EA4335",
        },
        accent: "#34A853", // Gemini Green
      },
    },
  },
  plugins: [],
}
