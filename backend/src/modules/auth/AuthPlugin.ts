import Elysia from "elysia";
import { auth } from "./auth";
import { getAuthSession } from "./session";

const isPublicRoute = (pathname: string) => pathname === "/health" || pathname.startsWith("/api/auth/");

export const AuthPlugin = new Elysia({ name: "AuthPlugin" })
	.mount(auth.handler)
	.derive({ as: "global" }, async ({ request }) => ({
		authSession: await getAuthSession(request),
	}))
	.onBeforeHandle({ as: "global" }, ({ authSession, request, status }) => {
		if (isPublicRoute(new URL(request.url).pathname)) return;
		if (!authSession) return status(401, { error: "Não autenticado" });
	});
