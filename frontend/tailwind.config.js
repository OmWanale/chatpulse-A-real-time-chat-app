/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          900: "#070b18",
          800: "#0d1328",
          700: "#171f3f",
          600: "#252f5e",
          500: "#3d4a82",
          accent: "#8b5cf6",
          accentSoft: "#a78bfa"
        }
      },
      boxShadow: {
        pane: "0 20px 55px rgba(9, 11, 26, 0.6)"
      }
    }
  },
  plugins: []
};

