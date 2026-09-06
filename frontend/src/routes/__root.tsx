import { createRootRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/layout";
import { Skeleton } from "@/components/ui/Skeleton";
import { initLocalDb } from "@/lib/localStorage";
import { useAuthStore, useThemeStore } from "@/stores";

function AppLoadingState() {
	return (
		<div className="grid min-h-dvh grid-cols-1 gap-6 p-5 lg:grid-cols-[240px_1fr] lg:p-8">
			<Skeleton className="hidden h-full lg:block" />
			<div className="grid content-start gap-5">
				<Skeleton className="h-12 w-56" />
				<div className="grid gap-4 md:grid-cols-3">
					<Skeleton className="h-36" />
					<Skeleton className="h-36" />
					<Skeleton className="h-36" />
				</div>
				<Skeleton className="h-80" />
			</div>
		</div>
	);
}

function RootComponent() {
	const pathname = useLocation().pathname;
	const navigate = useNavigate();
	const initializeTheme = useThemeStore(state => state.initializeTheme);
	const { initialize, isAuthenticated, isGuestMode, isInitialized, isRateLimited } = useAuthStore();
	const isPublicRoute = pathname.startsWith("/auth") || pathname === "/privacy" || pathname === "/terms";

	useEffect(() => {
		initializeTheme();
		void initLocalDb();
		void initialize();
	}, [initialize, initializeTheme]);

	useEffect(() => {
		if (!isInitialized || isPublicRoute || isRateLimited || isAuthenticated || isGuestMode) return;
		void navigate({ to: "/auth" });
	}, [isAuthenticated, isGuestMode, isInitialized, isPublicRoute, isRateLimited, navigate]);

	useEffect(() => {
		if (isRateLimited) toast.error("Não foi possível validar a sessão agora. Tente novamente em instantes.");
	}, [isRateLimited]);

	if (!isPublicRoute && !isInitialized) return <AppLoadingState />;
	if (isPublicRoute) return <Outlet />;
	return (
		<AppShell>
			<Outlet />
		</AppShell>
	);
}

export const Route = createRootRoute({ component: RootComponent });
