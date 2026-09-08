import { useState } from "react";
import { LuCalendarClock } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ScrollArea } from "@/components/ui/ScrollArea";
import type { Dashboard } from "@/lib/api";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });
const date = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });

export function DashboardForecasts({ forecasts }: Pick<Dashboard, "forecasts">) {
	const [open, setOpen] = useState(false);
	const rows = (items: Dashboard["forecasts"]) =>
		items.map(item => (
			<div className="flex items-center justify-between gap-3 rounded-xl border p-3" key={item.id}>
				<div>
					<p className="font-medium">{item.name}</p>
					<p className="text-muted-foreground text-xs">
						{item.type} · {date.format(new Date(`${item.date}T12:00:00`))}
					</p>
				</div>
				<strong className={item.direction === "INCOME" ? "text-emerald-600" : "text-rose-600"}>
					{item.direction === "INCOME" ? "+" : "−"}
					{currency.format(item.amount)}
				</strong>
			</div>
		));
	return (
		<>
			<Card>
				<CardHeader className="flex-row items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<LuCalendarClock className="text-primary" /> Previsões
					</CardTitle>
					<Button className="cursor-pointer" onClick={() => setOpen(true)} size="sm" variant="outline">
						Ver todas
					</Button>
				</CardHeader>
				<CardContent className="space-y-3">
					{rows(forecasts.slice(0, 4))}
					{!forecasts.length && <p className="text-muted-foreground text-sm">Nenhum compromisso futuro.</p>}
				</CardContent>
			</Card>
			<Dialog onOpenChange={setOpen} open={open}>
				<DialogContent className="max-h-[calc(100dvh-2rem)] sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>Próximas ocorrências</DialogTitle>
						<DialogDescription>Previsões calculadas. Nenhum lançamento futuro é criado.</DialogDescription>
					</DialogHeader>
					<ScrollArea className="max-h-[min(30rem,calc(100dvh-14rem))] pr-3">
						<div className="space-y-3">{rows(forecasts)}</div>
					</ScrollArea>
				</DialogContent>
			</Dialog>
		</>
	);
}
