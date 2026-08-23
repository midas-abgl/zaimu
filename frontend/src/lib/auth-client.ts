import { createAuthClient } from "better-auth/react";

export const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:3333").replace(/\/$/, "");
export const publicWebUrl = (import.meta.env.VITE_PUBLIC_WEB_URL || window.location.origin).replace(
	/\/$/,
	"",
);

export const authClient = createAuthClient({
	baseURL: apiUrl,
	fetchOptions: { credentials: "include" },
});

export const getAuthErrorMessage = (error: { message?: string; status?: number; statusText?: string }) => {
	if (error.status === 429) return "Muitas tentativas. Aguarde um instante e tente novamente.";
	if (error.status === 403) return "Confirme seu e-mail antes de entrar.";
	return error.message || error.statusText || "Não foi possível concluir. Tente novamente.";
};
