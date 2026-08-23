import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileNavigation } from "./MobileNavigation";

export function AppShell({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-dvh bg-background">
			<AppSidebar />
			<main className="min-h-dvh pb-24 lg:ml-64 lg:pb-0">{children}</main>
			<MobileNavigation />
		</div>
	);
}
