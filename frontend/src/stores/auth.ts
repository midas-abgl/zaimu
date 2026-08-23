import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authClient, getAuthErrorMessage } from "@/lib/auth-client";

export interface AuthUser {
	createdAt: Date;
	email: string;
	emailVerified: boolean;
	id: string;
	image?: null | string;
	name: string;
	updatedAt: Date;
}

export interface AuthState {
	clearError: () => void;
	enableGuestMode: () => void;
	error: null | string;
	guestId: string;
	initialize: () => Promise<void>;
	isAuthenticated: boolean;
	isGuestMode: boolean;
	isInitialized: boolean;
	isLoading: boolean;
	isRateLimited: boolean;
	login: (email: string, password: string) => Promise<boolean>;
	logout: () => Promise<void>;
	register: (name: string, email: string, password: string) => Promise<boolean>;
	user: AuthUser | null;
}

const generateGuestId = () => `guest_${crypto.randomUUID()}`;

export const useAuthStore = create<AuthState>()(
	persist(
		set => ({
			clearError: () => set({ error: null }),
			enableGuestMode: () =>
				set({ error: null, isAuthenticated: false, isGuestMode: true, isRateLimited: false, user: null }),
			error: null,
			guestId: generateGuestId(),
			initialize: async () => {
				set({ isLoading: true });
				try {
					const { data, error } = await authClient.getSession();
					if (error?.status === 429) {
						set({
							error: getAuthErrorMessage(error),
							isInitialized: true,
							isLoading: false,
							isRateLimited: true,
						});
						return;
					}
					set({
						error: error ? getAuthErrorMessage(error) : null,
						isAuthenticated: Boolean(data?.user),
						isGuestMode: data?.user ? false : useAuthStore.getState().isGuestMode,
						isInitialized: true,
						isLoading: false,
						isRateLimited: false,
						user: (data?.user as AuthUser | undefined) ?? null,
					});
				} catch {
					set({
						error: null,
						isAuthenticated: false,
						isInitialized: true,
						isLoading: false,
						isRateLimited: false,
						user: null,
					});
				}
			},
			isAuthenticated: false,
			isGuestMode: false,
			isInitialized: false,
			isLoading: false,
			isRateLimited: false,
			login: async (email, password) => {
				set({ error: null, isLoading: true, isRateLimited: false });
				let result: Awaited<ReturnType<typeof authClient.signIn.email>>;
				try {
					result = await authClient.signIn.email({ email, password });
				} catch {
					set({ error: "Servidor indisponível. Tente novamente em instantes.", isLoading: false });
					return false;
				}
				const { data, error } = result;
				if (error || !data?.user) {
					set({
						error: error ? getAuthErrorMessage(error) : "Não foi possível entrar.",
						isLoading: false,
						isRateLimited: error?.status === 429,
					});
					return false;
				}
				set({
					error: null,
					isAuthenticated: true,
					isGuestMode: false,
					isInitialized: true,
					isLoading: false,
					user: data.user as AuthUser,
				});
				return true;
			},
			logout: async () => {
				try {
					await authClient.signOut();
				} catch {
					// Sessão local deve ser limpa mesmo quando o servidor está indisponível.
				}
				set({
					error: null,
					isAuthenticated: false,
					isGuestMode: false,
					isInitialized: true,
					isRateLimited: false,
					user: null,
				});
			},
			register: async (name, email, password) => {
				set({ error: null, isLoading: true, isRateLimited: false });
				let result: Awaited<ReturnType<typeof authClient.signUp.email>>;
				try {
					result = await authClient.signUp.email({ email, name, password });
				} catch {
					set({ error: "Servidor indisponível. Tente novamente em instantes.", isLoading: false });
					return false;
				}
				const { error } = result;
				if (error) {
					set({
						error: getAuthErrorMessage(error),
						isLoading: false,
						isRateLimited: error.status === 429,
					});
					return false;
				}
				set({ error: null, isLoading: false });
				return true;
			},
			user: null,
		}),
		{
			name: "zaimu-auth",
			partialize: state => ({ guestId: state.guestId, isGuestMode: state.isGuestMode }),
			storage: createJSONStorage(() => localStorage),
		},
	),
);

export const getAuthHeader = (): HeadersInit => ({});
