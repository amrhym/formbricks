const colors = require("tailwindcss/colors");

module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#00E6CA",
          light: "#00E6CA",
          dark: "#00C4B8",
        },
        primary: {
          DEFAULT: "#0f172a",
          foreground: "#fefefe",
        },
        destructive: {
          DEFAULT: "#FF6B6B",
          foreground: "#FFF5F5",
        },
        secondary: {
          DEFAULT: "#f1f5f9",
          foreground: "#0f172a",
        },
        accent: {
          DEFAULT: "#f4f6f8",
          foreground: "#0f172a",
        },
        info: {
          DEFAULT: colors.blue[600],
          background: colors.blue[50],
        },
        warning: {
          DEFAULT: colors.amber[500],
          background: colors.amber[50],
        },
        success: {
          DEFAULT: colors.green[600],
          background: colors.green[50],
        },
        error: {
          DEFAULT: colors.red[600],
          background: colors.red[50],
        },
      },
    },
  },
  darkMode: "class",
  plugins: [require("@tailwindcss/forms")],
};
