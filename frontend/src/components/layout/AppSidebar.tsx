import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { LuLogOut } from "react-icons/lu";
import { toast } from "sonner";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores";
import { primaryNavigation, utilityNavigation } from "./navigation";

const active = (pathname: string, to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

export function AppSidebar() {
	const pathname = useLocation().pathname;
	const navigate = useNavigate();
	const { isGuestMode, logout, user } = useAuthStore();

	const signOut = async () => {
		await logout();
		toast.info("Sessão encerrada.");
		await navigate({ to: "/auth" });
	};

	return (
		<aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-border/70 border-r bg-card/95 p-4 backdrop-blur-xl lg:flex">
			<div className="px-2 py-4">
				<BrandMark />
			</div>
			<nav aria-label="Navegação principal" className="mt-5 grid gap-1">
				{primaryNavigation.map(item => (
					<Link
						className={
							active(pathname, item.to)
								? "flex items-center gap-3 rounded-xl border border-primary/15 bg-primary px-3 py-2.5 font-semibold text-primary-foreground text-sm shadow-soft"
								: "flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 font-medium text-muted-foreground text-sm hover:border-border hover:bg-muted hover:text-foreground"
						}
						key={item.to}
						to={item.to}
					>
						<item.icon className="size-5" />
						{item.label}
					</Link>
				))}
			</nav>
			<div className="mt-auto grid gap-2">
				{utilityNavigation.map(item => (
					<Link
						className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 font-medium text-sm hover:bg-muted"
						key={item.to}
						to={item.to}
					>
						<item.icon className="size-5" />
						{item.label}
					</Link>
				))}
				<div className="mt-2 rounded-2xl border border-border bg-muted/45 p-3">
					<p className="truncate font-semibold text-sm">{isGuestMode ? "Modo convidado" : user?.name}</p>
					<p className="truncate text-muted-foreground text-xs">
						{isGuestMode ? "Dados salvos neste dispositivo" : user?.email}
					</p>
				</div>
				{!isGuestMode && (
					<Button className="w-full justify-start" onClick={signOut} variant="outline">
						<LuLogOut /> Sair
					</Button>
				)}
			</div>
		</aside>
	);
}
