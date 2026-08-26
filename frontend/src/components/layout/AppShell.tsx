import type { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileNavigation } from "./MobileNavigation";

export function AppShell({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-dvh overflow-x-clip bg-background">
			<AppSidebar />
			<main className="min-h-dvh min-w-0 pb-24 lg:ml-64 lg:pb-0">{children}</main>
			<MobileNavigation />
		</div>
	);
}
