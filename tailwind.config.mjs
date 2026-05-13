/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        "bg-main": "#F8F0E8",
        "bg-stone": "#EADCD2",
        "brand-blush": "#F1C0CA",
        "brand-rose": "#E7A2B1",
        "status-sage": "#BBDED0",
        "status-olive": "#C5D5B9",
        "text-plum": "#875664",
      },
      fontFamily: {
        sans: ["Lunasima", "Noto Sans Hebrew", "Segoe UI", "Arial", "sans-serif"],
        heading: ["Gveret Levin", "Noto Sans Hebrew", "Segoe UI", "Arial", "sans-serif"],
      },
      boxShadow: {
        soft: "0 20px 60px -30px rgba(142, 111, 120, 0.3)",
        blush: "0 24px 80px -36px rgba(216, 180, 184, 0.65)",
      },
      backgroundImage: {
        "soft-radial":
          "radial-gradient(circle at top, rgba(230, 201, 207, 0.35), transparent 45%)",
      },
    },
  },
  plugins: [],
};
