import { LuCircleCheck, LuClock3 } from "react-icons/lu";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { TabsList, TabsTrigger } from "@/components/ui/Tabs";
import type { CreditCardStatement } from "@/lib/api";
import { formatLocalDate } from "@/lib/date";
import { cn } from "@/lib/utils";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function CreditCardStatementTabs({
	selectedId,
	statements,
}: {
	selectedId: string;
	statements: CreditCardStatement[];
}) {
	return (
		<ScrollArea className="h-[65dvh] border-r px-1 pr-3">
			<TabsList aria-label="Faturas" className="grid w-full gap-2 bg-transparent py-1 pr-1 pl-0">
				{statements.map(statement => {
					const selected = statement.id === selectedId;
					return (
						<TabsTrigger
							className={cn(
								"h-auto w-full cursor-pointer items-start justify-start whitespace-normal rounded-xl border-border p-3 text-left",
								selected && "border-primary bg-primary/10 ring-1 ring-primary/30",
							)}
							key={statement.id}
							value={statement.id}
						>
							<span className="grid min-w-0 flex-1 gap-1">
								<span className="font-semibold text-sm capitalize">
									{formatLocalDate(statement.statementDate, { month: "long", year: "numeric" })}
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
	);
}
