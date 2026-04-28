import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeState {
	mode: ThemeMode;
	resolvedTheme: "light" | "dark";
	setMode: (mode: ThemeMode) => void;
	initializeTheme: () => void;
}

// Get the resolved theme based on mode and system preference
function getResolvedTheme(mode: ThemeMode): "light" | "dark" {
	if (mode === "system") {
		if (typeof window !== "undefined") {
			return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
		}
		return "light";
	}
	return mode;
}

// Apply theme to document
function applyTheme(theme: "light" | "dark") {
	if (typeof document !== "undefined") {
		const root = document.documentElement;
		root.classList.remove("light", "dark");
		root.classList.add(theme);

		// Update meta theme-color for mobile browsers
		const metaThemeColor = document.querySelector('meta[name="theme-color"]');
		if (metaThemeColor) {
			metaThemeColor.setAttribute("content", theme === "dark" ? "#1e215f" : "#fbfbfd");
		}
	}
}

export const useThemeStore = create<ThemeState>()(
	persist(
		(set, get) => ({
			initializeTheme: () => {
				const { mode } = get();
				const resolvedTheme = getResolvedTheme(mode);
				applyTheme(resolvedTheme);
				set({ resolvedTheme });

				// Listen for system theme changes
				if (typeof window !== "undefined" && mode === "system") {
					const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

					const handleChange = (e: MediaQueryListEvent) => {
						const { mode: currentMode } = get();
						if (currentMode === "system") {
							const newResolvedTheme = e.matches ? "dark" : "light";
							applyTheme(newResolvedTheme);
							set({ resolvedTheme: newResolvedTheme });
						}
					};

					mediaQuery.addEventListener("change", handleChange);
				}
			},
			mode: "system",
			resolvedTheme: "light",

			setMode: mode => {
				const resolvedTheme = getResolvedTheme(mode);
				applyTheme(resolvedTheme);
				set({ mode, resolvedTheme });
			},
		}),
		{
			name: "zaimu-theme",
			partialize: state => ({ mode: state.mode }),
			storage: createJSONStorage(() => localStorage),
		},
	),
);
