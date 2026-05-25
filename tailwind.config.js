/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        casa: {
          purple: "#7c3aed",
          cyan: "#0891b2",
          green: "#059669",
          warning: "#d97706",
          error: "#dc2626",
          ink: "#172033"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 32, 51, 0.10)"
      }
    }
  },
  plugins: []
};
