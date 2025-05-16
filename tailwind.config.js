/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // This ensures dark mode is only applied with a class, not system preference
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#6419E6", // Purple
          "primary-content": "#FFF8E1", // Cream color for text on primary buttons
          "secondary": "#D926AA",
          "accent": "#1FB2A5",
          "neutral": "#191D24",
          "base-100": "#FFFFFF", // White background
          "base-200": "#F2F2F2",
          "base-300": "#E5E6E6",
          "base-content": "#1f2937", // Dark text
        },
      },
    ],
    darkTheme: "light", // Force light theme even when system is in dark mode
  },
} 