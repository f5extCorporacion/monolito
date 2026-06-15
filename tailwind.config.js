/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require("daisyui")  // ✅ DaisyUI va AQUÍ, no en postcss
  ],
  daisyui: {
    themes: ["light", "dark", "cupcake"], // temas opcionales
  },
}