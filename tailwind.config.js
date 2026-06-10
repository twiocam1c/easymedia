/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // 设计令牌:深色但有意图的"工具感"配色,非默认灰
        surface: {
          DEFAULT: "#0e1117",
          raised: "#161b22",
          overlay: "#1c2330",
        },
        ink: {
          DEFAULT: "#e6edf3",
          muted: "#8b949e",
          faint: "#6e7681",
        },
        accent: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
          soft: "#1e3a5f",
        },
        ok: "#3fb950",
        warn: "#d29922",
        danger: "#f85149",
      },
      borderRadius: {
        card: "14px",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
