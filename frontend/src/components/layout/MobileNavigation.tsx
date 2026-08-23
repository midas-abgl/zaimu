import { Link, useLocation } from "@tanstack/react-router";
import { primaryNavigation } from "./navigation";

const mobileItems = primaryNavigation.filter(item =>
	["/", "/transactions", "/accounts", "/credit-cards", "/more"].includes(item.to),
);

export function MobileNavigation() {
	const pathname = useLocation().pathname;
	return (
		<nav
			aria-label="Navegação móvel"
			className="safe-area-bottom fixed right-0 bottom-0 left-0 z-40 border-border border-t bg-card/95 px-2 pt-2 shadow-[0_-12px_36px_-26px_rgba(36,36,36,.45)] backdrop-blur-xl lg:hidden"
		>
			<div className="mx-auto flex max-w-xl justify-around">
				{mobileItems.map(item => {
					const isActive = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
					return (
						<Link
							aria-current={isActive ? "page" : undefined}
							className={
								isActive
									? "flex min-w-14 flex-col items-center gap-1 rounded-xl border border-primary/15 bg-primary/10 px-2 py-2 font-semibold text-[10px] text-primary"
									: "flex min-w-14 flex-col items-center gap-1 rounded-xl border border-transparent px-2 py-2 font-medium text-[10px] text-muted-foreground hover:border-border hover:bg-muted"
							}
							key={item.to}
							to={item.to}
						>
							<item.icon className="size-5" />
							{item.label}
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
