import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/Dialog";
import { ScrollArea } from "@/components/ui/ScrollArea";
import type { TransactionImportDuplicate, TransactionImportItem } from "@/lib/api";
import { formatLocalTime } from "@/lib/date";

export type DuplicateField =
	| "amount"
	| "date"
	| "description"
	| "destinationFinancialAccountId"
	| "isHidden"
	| "originFinancialAccountId"
	| "storeName"
	| "tagIds"
	| "time"
	| "type";
export type DuplicateSource = "duplicate" | "imported";
export type DuplicateResolutionSources = Partial<Record<DuplicateField, DuplicateSource>>;
type Field = DuplicateField;
type Source = DuplicateSource;
const baseFields: Array<{ key: Field; label: string }> = [
	{ key: "amount", label: "Valor" },
	{ key: "date", label: "Data" },
	{ key: "time", label: "Horário" },
	{ key: "description", label: "Descrição" },
	{ key: "type", label: "Tipo" },
	{ key: "storeName", label: "Loja" },
	{ key: "tagIds", label: "Tags" },
];
const transferAccountFields: Array<{ key: Field; label: string }> = [
	{ key: "originFinancialAccountId", label: "Conta de origem" },
	{ key: "destinationFinancialAccountId", label: "Conta de destino" },
];
const transactionTypeLabels = {
	EXPENSE: "Saída",
	INCOME: "Entrada",
	TRANSFER: "Transferência",
	YIELD: "Rendimento",
} as const;
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });

function getFields(type?: TransactionImportDuplicate["type"]) {
	return type === "TRANSFER" ? [...baseFields, ...transferAccountFields] : baseFields;
}

function formatDate(value: unknown) {
	const date = String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0];
	return date ? dateFormatter.format(new Date(`${date}T00:00:00Z`)) : "Não informado";
}

export function DuplicateResolutionDialog({
	accountNames,
	item,
	onOpenChange,
	onResolve,
	open,
}: {
	accountNames: Map<string, string>;
	item: TransactionImportItem | null;
	onOpenChange: (open: boolean) => void;
	onResolve: (
		item: TransactionImportItem,
		duplicate: TransactionImportDuplicate,
		data: DuplicateResolutionSources,
	) => Promise<void>;
	open: boolean;
}) {
	const duplicate = item?.duplicate ?? null;
	const fields = getFields(duplicate?.type);
	const [sources, setSources] = useState<DuplicateResolutionSources>(
		() => Object.fromEntries(fields.map(field => [field.key, "imported"])) as Record<Field, Source>,
	);
	const [isSaving, setIsSaving] = useState(false);
	useEffect(() => {
		if (open) {
			setSources(Object.fromEntries(getFields(item?.duplicate?.type).map(field => [field.key, "imported"])));
		}
	}, [open, item?.id]);
	if (!item || !duplicate) return null;
	const value = (source: Source, field: Field) => {
		const record = source === "imported" ? item : duplicate;
		const selected = record[field];
		if (field === "amount")
			return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(Number(selected));
		if (field === "date") return formatDate(selected);
		if (field === "time") return formatLocalTime(selected ? String(selected) : undefined) ?? "Não informado";
		if (field === "originFinancialAccountId" || field === "destinationFinancialAccountId")
			return selected ? (accountNames.get(String(selected)) ?? "Conta removida") : "Não informado";
		if (field === "tagIds") {
			const tags = record.tags ?? [];
			return tags.length ? tags.map(tag => tag.name).join(", ") : "Sem tags";
		}
		if (field === "isHidden") return selected ? "Oculta" : "Visível";
		if (field === "type")
			return transactionTypeLabels[selected as keyof typeof transactionTypeLabels] ?? "Não informado";
		return selected ? String(selected) : "Não informado";
	};
	const save = async () => {
		setIsSaving(true);
		try {
			await onResolve(item, duplicate, sources);
		} finally {
			setIsSaving(false);
		}
	};
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Resolver duplicata</DialogTitle>
					<DialogDescription>
						Selecione a origem de cada dado. O resultado atualizará a transação existente.
					</DialogDescription>
				</DialogHeader>
				<ScrollArea className="min-h-0 pr-1">
					<div className="space-y-4 pr-3">
						<div className="overflow-hidden rounded-2xl border">
							<div className="grid grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] border-b text-center font-medium text-xs">
								<span />
								<span className="p-3">Nova</span>
								<span className="border-l p-3">Existente</span>
							</div>
							{fields.map(field => (
								<div
									className="grid grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] border-b last:border-0"
									key={field.key}
								>
									<span className="flex items-center px-3 font-medium text-xs">{field.label}</span>
									<Button
										className="h-auto min-h-11 justify-start whitespace-normal rounded-none border-x-0 border-y-0 border-l text-left text-xs"
										onClick={() => setSources(current => ({ ...current, [field.key]: "imported" }))}
										size="sm"
										variant={sources[field.key] === "imported" ? "default" : "outline"}
									>
										{value("imported", field.key)}
									</Button>
									<Button
										className="h-auto min-h-11 justify-start whitespace-normal rounded-none border-0 text-left text-xs"
										onClick={() => setSources(current => ({ ...current, [field.key]: "duplicate" }))}
										size="sm"
										variant={sources[field.key] === "duplicate" ? "default" : "outline"}
									>
										{value("duplicate", field.key)}
									</Button>
								</div>
							))}
						</div>
					</div>
				</ScrollArea>
				<DialogFooter>
					<Button className="cursor-pointer" onClick={() => onOpenChange(false)} variant="outline">
						Cancelar
					</Button>
					<Button className="cursor-pointer" disabled={isSaving} onClick={save}>
						Salvar
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
