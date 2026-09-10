import type { ReactNode } from "react";
import { LuCheckCheck, LuChevronDown, LuChevronUp } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";

export function ImportReviewDateSection({
	children,
	collapsed,
	dateLabel,
	itemCount,
	onApproveAll,
	onCollapsedChange,
	approveAllDisabled,
	approveAllPending,
}: {
	approveAllDisabled: boolean;
	approveAllPending: boolean;
	children: ReactNode;
	collapsed: boolean;
	dateLabel: string;
	itemCount: number;
	onApproveAll: () => void;
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
				<div className="flex shrink-0 items-center gap-2">
					<Button
						className="cursor-pointer disabled:cursor-not-allowed"
						disabled={approveAllDisabled}
						onClick={onApproveAll}
						size="sm"
						variant="outline"
					>
						<LuCheckCheck aria-hidden="true" />
						{approveAllPending ? "Aprovando…" : "Aprovar todas"}
					</Button>
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
			</div>
			{collapsed ? null : (
				<div className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">{children}</div>
			)}
		</section>
	);
}
