import type { ReactNode } from "react";
import { LuChevronDown, LuChevronUp } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";

export function ImportReviewDateSection({
	children,
	collapsed,
	dateLabel,
	itemCount,
	onCollapsedChange,
}: {
	children: ReactNode;
	collapsed: boolean;
	dateLabel: string;
	itemCount: number;
	onCollapsedChange: (collapsed: boolean) => void;
}) {
	const actionLabel = collapsed
		? `Expandir transações de ${dateLabel}`
		: `Minimizar transações de ${dateLabel}`;
	const countLabel = `${itemCount} ${itemCount === 1 ? "transação" : "transações"}`;

	return (
		<section className="space-y-2">
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<h3 className="font-medium text-muted-foreground text-sm">{dateLabel}</h3>
					<p className="text-muted-foreground text-xs">{countLabel}</p>
				</div>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							aria-expanded={!collapsed}
							aria-label={actionLabel}
							className="cursor-pointer"
							onClick={() => onCollapsedChange(!collapsed)}
							size="icon-sm"
							variant="outline"
						>
							{collapsed ? <LuChevronDown aria-hidden="true" /> : <LuChevronUp aria-hidden="true" />}
						</Button>
					</TooltipTrigger>
					<TooltipContent>{actionLabel}</TooltipContent>
				</Tooltip>
			</div>
			{collapsed ? null : (
				<div className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">{children}</div>
			)}
		</section>
	);
}
