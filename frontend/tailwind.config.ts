import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}", "./lib/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-muted": "rgb(var(--surface-muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        muted: "rgb(var(--muted-foreground) / <alpha-value>)",
        primary: "rgb(var(--primary) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        income: "rgb(var(--income) / <alpha-value>)",
        expense: "rgb(var(--expense) / <alpha-value>)",
        transfer: "rgb(var(--transfer) / <alpha-value>)",
        credit: "rgb(var(--credit) / <alpha-value>)",
        "fantasy-brown": "rgb(var(--fantasy-brown) / <alpha-value>)",
        "fantasy-beige": "rgb(var(--fantasy-beige) / <alpha-value>)",
        "adventure-green": "rgb(var(--adventure-green) / <alpha-value>)",
        "sky-blue": "rgb(var(--sky-blue) / <alpha-value>)",
        "quest-yellow": "rgb(var(--quest-yellow) / <alpha-value>)",
        "warning-orange": "rgb(var(--warning-orange) / <alpha-value>)",
        "success-green": "rgb(var(--success-green) / <alpha-value>)",
        "danger-red": "rgb(var(--danger-red) / <alpha-value>)"
      },
      boxShadow: {
        panel: "inset 0 1px 0 rgb(255 255 255 / 0.08), 0 12px 30px rgb(0 0 0 / 0.24)"
      },
      borderRadius: {
        ui: "0.5rem"
      }
    }
  },
  plugins: []
};

export default config;
