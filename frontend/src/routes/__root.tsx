import { createRootRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { HiArrowsRightLeft, HiBanknotes, HiCreditCard, HiEllipsisHorizontal, HiHome } from "react-icons/hi2";
import { initLocalDb } from "@/lib/localStorage";
import { useAuthStore, useThemeStore } from "@/stores";

const navItems = [
	{ icon: HiHome, label: "Home", to: "/" },
	{ icon: HiArrowsRightLeft, label: "Transactions", to: "/transactions" },
	{ icon: HiCreditCard, label: "Cards", to: "/credit-cards" },
	{ icon: HiBanknotes, label: "Loans", to: "/loans" },
	{ icon: HiEllipsisHorizontal, label: "More", to: "/more" },
];

// Routes that don't require auth check
const publicRoutes = ["/auth"];

function RootComponent() {
	const location = useLocation();
	const navigate = useNavigate();
	const initializeTheme = useThemeStore(s => s.initializeTheme);
	const { isAuthenticated, isGuestMode } = useAuthStore();

	// Initialize theme and local DB on mount
	useEffect(() => {
		initializeTheme();
		initLocalDb();
	}, [initializeTheme]);

	// Redirect to auth if not authenticated and not on public route
	useEffect(() => {
		const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));
		const hasAccess = isAuthenticated || isGuestMode;

		// if (!hasAccess && !isPublicRoute) {
		// 	navigate({ to: "/auth" });
		// }
	}, [isAuthenticated, isGuestMode, location.pathname]);

	// Hide nav on auth page
	const isAuthPage = location.pathname === "/auth";

	return (
		<div className="flex min-h-screen flex-col bg-background">
			<main className={`flex-1 ${!isAuthPage ? "pb-20" : ""} overflow-auto`}>
				<Outlet />
			</main>

			{/* Bottom Navigation - Glassmorphism style */}
			{!isAuthPage && (
				<nav className="glass safe-area-bottom fixed right-0 bottom-0 left-0 z-40 border-border-light border-t shadow-soft">
					<div className="flex h-16 items-center justify-around px-2">
						{navItems.map(item => {
							const isActive =
								item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);

							return (
								<Link
									className={`no-select relative flex flex-col items-center justify-center rounded-2xl px-4 py-2 transition-all duration-300 ${
										isActive ? "text-primary-500" : "text-foreground-muted hover:text-primary-500"
									}`}
									key={item.to}
									to={item.to}
								>
									{isActive && (
										<span className="absolute inset-0 animate-scale-in rounded-2xl bg-primary-500/10" />
									)}
									<item.icon
										className={`relative h-6 w-6 transition-transform duration-200 ${
											isActive ? "scale-110" : ""
										}`}
									/>
									<span
										className={`relative mt-1 font-medium text-[10px] transition-all duration-200 ${
											isActive ? "text-primary-500" : ""
										}`}
									>
										{item.label}
									</span>
								</Link>
							);
						})}
					</div>
				</nav>
			)}
		</div>
	);
}

export const Route = createRootRoute({
	component: RootComponent,
});
