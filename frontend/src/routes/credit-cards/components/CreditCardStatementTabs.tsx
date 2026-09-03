import { useLayoutEffect, useRef } from "react";
import { LuCircleCheck, LuClock3 } from "react-icons/lu";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { TabsList, TabsTrigger } from "@/components/ui/Tabs";
import type { CreditCardStatement } from "@/lib/api";
import { parseLocalDate } from "@/lib/date";
import { cn } from "@/lib/utils";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });
const statementMonthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });

function formatStatementMonth(value: string) {
	const parts = statementMonthFormatter.formatToParts(parseLocalDate(value));
	const month = parts.find(part => part.type === "month")?.value.replace(".", "") ?? "";
	const year = parts.find(part => part.type === "year")?.value ?? "";

	return `${month.charAt(0).toUpperCase()}${month.slice(1)}/${year}`;
}

export function CreditCardStatementTabs({
	selectedId,
	statements,
}: {
	selectedId: string;
	statements: CreditCardStatement[];
}) {
	const scrollAreaRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const scrollArea = scrollAreaRef.current;
		const viewport = scrollArea?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]');
		const activeTab = scrollArea?.querySelector<HTMLElement>(
			'[data-slot="tabs-trigger"][data-state="active"]',
		);

		if (!viewport || !activeTab || viewport.scrollWidth <= viewport.clientWidth) return;

		const viewportRect = viewport.getBoundingClientRect();
		const activeTabRect = activeTab.getBoundingClientRect();
		const targetLeft =
			viewport.scrollLeft +
			activeTabRect.left -
			viewportRect.left -
			(viewportRect.width - activeTabRect.width) / 2;

		viewport.scrollTo({ behavior: "auto", left: Math.max(0, targetLeft) });
	}, [selectedId]);

	return (
		<div className="h-full min-w-0" ref={scrollAreaRef}>
			<ScrollArea
				className="h-full border-b px-1 pb-3 min-[480px]:border-r min-[480px]:border-b-0 min-[480px]:pr-3 min-[480px]:pb-0"
				horizontalScrollbar
				verticalScrollbar={false}
			>
				<TabsList
					aria-label="Faturas"
					className="!flex-row min-[480px]:!grid h-full w-max min-w-full gap-2 bg-transparent py-1 pr-1 pl-0 min-[480px]:w-full"
				>
					{statements.map(statement => {
						const selected = statement.id === selectedId;
						return (
							<TabsTrigger
								className={cn(
									"h-full w-36 shrink-0 cursor-pointer items-start justify-start whitespace-normal rounded-xl border-border p-3 text-left min-[480px]:h-auto min-[480px]:w-full",
									selected && "border-primary bg-primary/10 ring-1 ring-primary/30",
								)}
								key={statement.id}
								value={statement.id}
							>
								<span className="grid min-w-0 flex-1 gap-1">
									<span className="font-semibold text-sm">
										{formatStatementMonth(statement.statementDate)}
									</span>
									<span className="font-normal text-muted-foreground text-xs">
										{statement.isPaid ? (
											<span className="flex items-center gap-1">
												<LuCircleCheck /> Paga
											</span>
										) : (
											<span className="flex items-center gap-1">
												<LuClock3 /> Em aberto
											</span>
										)}
									</span>
									<strong className="truncate text-sm">{currency.format(statement.totalAmount)}</strong>
								</span>
							</TabsTrigger>
						);
					})}
				</TabsList>
			</ScrollArea>
		</div>
	);
}
