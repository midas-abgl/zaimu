import { useState } from "react";
import { LuCalendarClock } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { ScrollArea } from "@/components/ui/ScrollArea";
import type { Dashboard } from "@/lib/api";
import { DashboardForecastItem } from "./DashboardForecastItem";

export function DashboardForecasts({ forecasts }: Pick<Dashboard, "forecasts">) {
	const [open, setOpen] = useState(false);
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
					{forecasts.slice(0, 4).map(forecast => (
						<DashboardForecastItem forecast={forecast} key={forecast.id} variant="compact" />
					))}
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
						<div className="space-y-3">
							{forecasts.map(forecast => (
								<DashboardForecastItem forecast={forecast} key={forecast.id} variant="detailed" />
							))}
						</div>
					</ScrollArea>
				</DialogContent>
			</Dialog>
		</>
	);
}
