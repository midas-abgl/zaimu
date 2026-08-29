import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ListItemLayout({
	actions,
	amount,
	children,
	className,
	icon,
	metadata,
	tags,
	title,
}: {
	actions?: ReactNode;
	amount: ReactNode;
	children?: ReactNode;
	className?: string;
	icon: ReactNode;
	metadata?: ReactNode;
	tags?: ReactNode;
	title: ReactNode;
}) {
	return (
		<div className={cn("grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-4 py-5", className)}>
			{icon}
			<div className="min-w-0 space-y-2.5">
				<div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
					{title}
					{amount}
				</div>
				{metadata ? <div className="flex min-w-0 flex-wrap items-center gap-1.5">{metadata}</div> : null}
				{tags}
				{children}
				{actions ? <div className="flex flex-wrap justify-end gap-2 pt-3">{actions}</div> : null}
			</div>
		</div>
	);
}
