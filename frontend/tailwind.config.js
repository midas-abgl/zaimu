/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	darkMode: "class",
	plugins: [],
	theme: {
		extend: {
			borderRadius: {
				"2xl": "1rem",
				"3xl": "1.25rem",
				"4xl": "1.5rem",
				xl: "0.875rem",
			},
			boxShadow: {
				card: "var(--shadow-card)",
				"card-hover": "var(--shadow-card-hover)",
				modal: "var(--shadow-modal)",
				soft: "var(--shadow-soft)",
			},
			colors: {
				// Accent yellow from Figma
				accent: {
					300: "rgb(var(--color-accent-300) / <alpha-value>)",
					400: "rgb(var(--color-accent-400) / <alpha-value>)",
					500: "rgb(var(--color-accent-500) / <alpha-value>)",
				},
				// Dynamic background colors
				background: {
					card: "rgb(var(--color-bg-card) / <alpha-value>)",
					DEFAULT: "rgb(var(--color-bg) / <alpha-value>)",
					elevated: "rgb(var(--color-bg-elevated) / <alpha-value>)",
					secondary: "rgb(var(--color-bg-secondary) / <alpha-value>)",
				},
				// Border colors
				border: {
					DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
					light: "rgb(var(--color-border-light) / <alpha-value>)",
				},
				// Semantic colors
				danger: {
					50: "#fef2f2",
					100: "#fee2e2",
					200: "#fecaca",
					500: "rgb(var(--color-danger) / <alpha-value>)",
					600: "#dc2626",
					DEFAULT: "rgb(var(--color-danger) / <alpha-value>)",
				},
				// Dynamic text colors
				foreground: {
					DEFAULT: "rgb(var(--color-text) / <alpha-value>)",
					light: "rgb(var(--color-text-tertiary) / <alpha-value>)",
					muted: "rgb(var(--color-text-secondary) / <alpha-value>)",
					secondary: "rgb(var(--color-text-secondary) / <alpha-value>)",
					tertiary: "rgb(var(--color-text-tertiary) / <alpha-value>)",
				},
				// Primary purple-blue palette from Figma (using CSS variables for theme support)
				primary: {
					50: "rgb(var(--color-primary-50) / <alpha-value>)",
					100: "rgb(var(--color-primary-100) / <alpha-value>)",
					200: "rgb(var(--color-primary-200) / <alpha-value>)",
					300: "rgb(var(--color-primary-300) / <alpha-value>)",
					400: "rgb(var(--color-primary-400) / <alpha-value>)",
					500: "rgb(var(--color-primary-500) / <alpha-value>)",
					600: "rgb(var(--color-primary-600) / <alpha-value>)",
					700: "rgb(var(--color-primary-700) / <alpha-value>)",
					800: "rgb(var(--color-primary-800) / <alpha-value>)",
					900: "rgb(var(--color-primary-900) / <alpha-value>)",
				},
				success: {
					50: "#f0fdf4",
					100: "#dcfce7",
					200: "#bbf7d0",
					500: "rgb(var(--color-success) / <alpha-value>)",
					600: "#16a34a",
					DEFAULT: "rgb(var(--color-success) / <alpha-value>)",
				},
				warning: {
					50: "#fffbeb",
					100: "#fef3c7",
					500: "rgb(var(--color-warning) / <alpha-value>)",
					DEFAULT: "rgb(var(--color-warning) / <alpha-value>)",
				},
			},
			fontFamily: {
				sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
			},
			spacing: {
				safe: "env(safe-area-inset-bottom)",
				"safe-top": "env(safe-area-inset-top)",
			},
			transitionTimingFunction: {
				"bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
				smooth: "cubic-bezier(0.32, 0.72, 0, 1)",
			},
		},
	},
};
