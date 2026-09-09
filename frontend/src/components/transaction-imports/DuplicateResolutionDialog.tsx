import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/Dialog";
import type { TransactionImportDuplicate, TransactionImportItem } from "@/lib/api";

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
type Field = DuplicateField;
type Source = DuplicateSource;
const fields: Array<{ key: Field; label: string }> = [
	{ key: "amount", label: "Valor" },
	{ key: "date", label: "Data" },
	{ key: "time", label: "Horário" },
	{ key: "description", label: "Descrição" },
	{ key: "originFinancialAccountId", label: "Conta de origem" },
	{ key: "destinationFinancialAccountId", label: "Conta de destino" },
	{ key: "type", label: "Tipo" },
	{ key: "storeName", label: "Loja" },
	{ key: "tagIds", label: "Tags" },
	{ key: "isHidden", label: "Exibir na listagem" },
];

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
		data: Record<Field, Source>,
		keep: Source,
	) => Promise<void>;
	open: boolean;
}) {
	const duplicate = item?.duplicate ?? null;
	const [keep, setKeep] = useState<Source>("imported");
	const [sources, setSources] = useState<Record<Field, Source>>(
		() => Object.fromEntries(fields.map(field => [field.key, "imported"])) as Record<Field, Source>,
	);
	useEffect(() => {
		if (open) {
			setKeep("imported");
			setSources(Object.fromEntries(fields.map(field => [field.key, "imported"])) as Record<Field, Source>);
		}
	}, [open, item?.id]);
	const pending = useMemo(() => false, []);
	if (!item || !duplicate) return null;
	const value = (source: Source, field: Field) => {
		const record = source === "imported" ? item : duplicate;
		const selected = record[field];
		if (field === "amount")
			return new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(Number(selected));
		if (field === "originFinancialAccountId" || field === "destinationFinancialAccountId")
			return selected ? (accountNames.get(String(selected)) ?? "Conta removida") : "Não informado";
		if (field === "tagIds")
			return Array.isArray(selected) && selected.length ? selected.join(", ") : "Sem tags";
		if (field === "isHidden") return selected ? "Oculta" : "Visível";
		return selected ? String(selected) : "Não informado";
	};
	const save = () => onResolve(item, duplicate, sources, keep);
	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Resolver duplicata</DialogTitle>
					<DialogDescription>
						Compare, escolha o registro que fica e selecione a origem de cada dado.
					</DialogDescription>
				</DialogHeader>
				<div className="scrollbar-themed min-h-0 space-y-4 overflow-y-auto pr-1">
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
					<div className="flex flex-wrap gap-2">
						<Button
							className="cursor-pointer"
							onClick={() => setKeep("imported")}
							variant={keep === "imported" ? "default" : "outline"}
						>
							Manter nova
						</Button>
						<Button
							className="cursor-pointer"
							onClick={() => setKeep("duplicate")}
							variant={keep === "duplicate" ? "default" : "outline"}
						>
							Manter existente
						</Button>
					</div>
				</div>
				<DialogFooter>
					<Button className="cursor-pointer" onClick={() => onOpenChange(false)} variant="outline">
						Cancelar
					</Button>
					<ConfirmActionButton
						className="cursor-pointer"
						confirmation={
							keep === "imported" && duplicate.source === "TRANSACTION"
								? "A transação existente será excluída permanentemente. Continuar?"
								: "Aplicar esta resolução?"
						}
						disabled={pending}
						onConfirm={save}
					>
						{keep === "imported" ? "Salvar e manter nova" : "Salvar e manter existente"}
					</ConfirmActionButton>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
