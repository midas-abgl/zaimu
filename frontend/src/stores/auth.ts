import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { User } from "@/lib/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";

export interface AuthState {
	// User data
	user: User | null;
	token: string | null;

	// State flags
	isAuthenticated: boolean;
	isGuestMode: boolean;
	isLoading: boolean;
	error: string | null;

	// Guest mode ID (for local data identification)
	guestId: string;

	// Actions
	login: (email: string, password: string) => Promise<boolean>;
	register: (email: string, password: string, name?: string) => Promise<boolean>;
	logout: () => void;
	refreshToken: () => Promise<boolean>;
	enableGuestMode: () => void;
	clearError: () => void;
	setToken: (token: string) => void;
	setUser: (user: User | null) => void;
}

// Generate a persistent guest ID
const generateGuestId = () => `guest_${crypto.randomUUID()}`;

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			clearError: () => set({ error: null }),

			enableGuestMode: () => {
				set({
					isAuthenticated: false,
					isGuestMode: true,
					token: null,
					user: null,
				});
			},
			error: null,
			guestId: generateGuestId(),
			isAuthenticated: false,
			isGuestMode: false,
			isLoading: false,

			login: async (email: string, password: string) => {
				set({ error: null, isLoading: true });
				try {
					const response = await fetch(`${API_URL}/users/login`, {
						body: JSON.stringify({ email, password }),
						headers: { "Content-Type": "application/json" },
						method: "POST",
					});

					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || "Login failed");
					}

					const data = await response.json();
					set({
						error: null,
						isAuthenticated: true,
						isGuestMode: false,
						isLoading: false,
						token: data.token,
						user: data.user,
					});
					return true;
				} catch (error) {
					set({
						error: error instanceof Error ? error.message : "Login failed",
						isLoading: false,
					});
					return false;
				}
			},

			logout: () => {
				set({
					error: null,
					isAuthenticated: false,
					isGuestMode: false,
					token: null,
					user: null,
				});
			},

			refreshToken: async () => {
				const { token } = get();
				if (!token) return false;

				try {
					const response = await fetch(`${API_URL}/users/refresh`, {
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
						},
						method: "POST",
					});

					if (!response.ok) {
						// Token invalid, log out
						get().logout();
						return false;
					}

					const data = await response.json();
					set({
						token: data.token,
						user: data.user,
					});
					return true;
				} catch {
					get().logout();
					return false;
				}
			},

			register: async (email: string, password: string, name?: string) => {
				set({ error: null, isLoading: true });
				try {
					const response = await fetch(`${API_URL}/users/register`, {
						body: JSON.stringify({ email, name, password }),
						headers: { "Content-Type": "application/json" },
						method: "POST",
					});

					if (!response.ok) {
						const error = await response.json();
						throw new Error(error.error || "Registration failed");
					}

					const data = await response.json();
					set({
						error: null,
						isAuthenticated: true,
						isGuestMode: false,
						isLoading: false,
						token: data.token,
						user: data.user,
					});
					return true;
				} catch (error) {
					set({
						error: error instanceof Error ? error.message : "Registration failed",
						isLoading: false,
					});
					return false;
				}
			},

			setToken: (token: string) => set({ token }),

			setUser: (user: User | null) => set({ isAuthenticated: !!user, user }),
			token: null,
			user: null,
		}),
		{
			name: "zaimu-auth",
			partialize: state => ({
				guestId: state.guestId,
				isAuthenticated: state.isAuthenticated,
				isGuestMode: state.isGuestMode,
				token: state.token,
				user: state.user,
			}),
			storage: createJSONStorage(() => localStorage),
		},
	),
);

// Helper to get auth header
export const getAuthHeader = (): HeadersInit => {
	const token = useAuthStore.getState().token;
	return token ? { Authorization: `Bearer ${token}` } : {};
};
