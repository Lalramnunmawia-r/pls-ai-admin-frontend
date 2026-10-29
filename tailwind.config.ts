import type { Config } from "tailwindcss";

// Design tokens ported from lushaiedu_pls_web/app/globals.css (Tailwind v4 @theme) so the
// AI admin matches the main LushAIEdu web app. Hex values keep opacity modifiers working.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f6f7f9",
        surface: "#ffffff",
        "surface-muted": "#f1f3f6",
        line: "#e6e8ec",
        "line-strong": "#d5d9e0",
        ink: "#14161a",
        "ink-muted": "#667085",
        "ink-subtle": "#98a2b3",
        accent: "#ff4500",
        "accent-hover": "#e63e00",
        "accent-soft": "#fff1eb",
        navy: "#001b5e",
        success: "#12805c",
        "success-soft": "#e8f6f0",
        warning: "#b54708",
        "warning-soft": "#fff4e5",
        danger: "#d92d20",
        "danger-soft": "#fdecea",
        info: "#1d4ed8",
        "info-soft": "#eef4ff"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      borderRadius: {
        card: "16px",
        control: "10px"
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.04)",
        raised: "0 2px 4px rgba(16,24,40,.04), 0 8px 20px rgba(16,24,40,.08)",
        overlay: "0 12px 40px rgba(16,24,40,.18)"
      }
    }
  },
  plugins: []
};

export default config;
