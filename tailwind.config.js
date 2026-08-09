/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Temu reference palette (Stage 1 only - replaced in Stage 2).
        brand: {
          DEFAULT: "#FB7701",
          50: "#FFF6EF",
          100: "#FFEBD9",
          200: "#FFD3AC",
          500: "#FB7701",
          600: "#E56A00",
          700: "#C25A00",
        },
        deal: { DEFAULT: "#FF3300", dark: "#D92A00" },
        trust: "#0A8800",
        ink: { DEFAULT: "#1A1A1A", 2: "#4A4A4A", 3: "#767676", 4: "#9A9A9A" },
        line: { DEFAULT: "#E8E8E8", 2: "#F0F0F0" },
        surface: { DEFAULT: "#FFFFFF", muted: "#F7F7F7", sunken: "#F2F2F2" },
      },
      fontFamily: {
        sans: [
          '"Helvetica Neue"', "Helvetica", "-apple-system", "BlinkMacSystemFont",
          '"Segoe UI"', "Roboto", "Arial", "sans-serif",
        ],
      },
      fontSize: {
        "2xs": ["10px", "14px"],
        xs: ["11px", "15px"],
        sm: ["12px", "17px"],
        base: ["13px", "19px"],
        md: ["14px", "20px"],
        lg: ["16px", "22px"],
        xl: ["18px", "25px"],
        "2xl": ["21px", "28px"],
        "3xl": ["26px", "32px"],
        "4xl": ["32px", "38px"],
      },
      borderRadius: { card: "8px", pill: "999px" },
      boxShadow: {
        card: "0 1px 4px rgba(0,0,0,0.06)",
        hover: "0 6px 20px rgba(0,0,0,0.12)",
        pop: "0 4px 24px rgba(0,0,0,0.16)",
        nav: "0 2px 8px rgba(0,0,0,0.08)",
      },
      maxWidth: { shell: "1500px" },
      screens: { xs: "420px", "3xl": "1600px" },
      keyframes: {
        "slide-up": { from: { transform: "translateY(100%)" }, to: { transform: "translateY(0)" } },
        "slide-down": { from: { transform: "translateY(-8px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "toast-in": { from: { opacity: "0", transform: "translateY(10px) scale(.96)" }, to: { opacity: "1", transform: "translateY(0) scale(1)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "slide-up": "slide-up .24s cubic-bezier(.32,.72,0,1)",
        "slide-down": "slide-down .18s ease-out",
        "fade-in": "fade-in .2s ease-out",
        "toast-in": "toast-in .2s ease-out",
      },
    },
  },
  plugins: [],
};
