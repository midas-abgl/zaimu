import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LuCircleAlert, LuFileCheck2, LuPencil, LuToggleLeft, LuToggleRight } from "react-icons/lu";
import { TransactionListItem } from "@/components/transactions";
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
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Transaction, TransactionImportItem } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import { formatLocalDate, formatLocalTime } from "@/lib/date";
import { showToast } from "@/stores";
import { EditImportedTransactionDialog } from "./EditImportedTransactionDialog";

function toTransaction(item: TransactionImportItem, accountNames: Map<string, string>): Transaction {
	const originName = item.originFinancialAccountId
		? accountNames.get(item.originFinancialAccountId)
		: undefined;
	const destinationName = item.destinationFinancialAccountId
		? accountNames.get(item.destinationFinancialAccountId)
		: undefined;
	return {
		amount: item.amount,
		createdAt: item.createdAt,
		date: item.date,
		description: item.description ?? undefined,
		destinationFinancialAccountId: item.destinationFinancialAccountId,
		destinationName,
		externalId: item.externalId,
		id: item.id,
		isHidden: item.isHidden,
		originFinancialAccountId: item.originFinancialAccountId,
		originName,
		source: "FINANCIAL_ACCOUNT",
		sourceName: item.type === "INCOME" ? destinationName : originName,
		storeName: item.storeName,
		tagIds: item.tagIds,
		tags: item.tags,
		time: item.time,
		type: item.type,
	};
}

export function TransactionImportReviewDialog({
	importId,
	onOpenChange,
	open,
}: {
	importId: string | null;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const queryClient = useQueryClient();
	const [editingItem, setEditingItem] = useState<TransactionImportItem | null>(null);
	const transactionImport = useQuery({
		enabled: open && Boolean(importId),
		queryFn: () => dataService.transactionImports.get(importId!),
		queryKey: ["transaction-import", importId],
	});
	const accounts = useQuery({ enabled: open, queryFn: dataService.accounts.getAll, queryKey: ["accounts"] });
	const invalidate = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["pending-transaction-imports"] }),
			queryClient.invalidateQueries({ queryKey: ["transaction-import", importId] }),
		]);
	};
	const updateItem = useMutation({
		mutationFn: ({
			item,
			data,
		}: {
			item: TransactionImportItem;
			data: Parameters<typeof dataService.transactionImports.updateItem>[2];
		}) => dataService.transactionImports.updateItem(importId!, item.id, data),
		onError: error => showToast(error.message, "negative"),
		onSuccess: async () => {
			setEditingItem(null);
			await invalidate();
			showToast("Transação importada atualizada.", "positive");
		},
	});
	const approve = useMutation({
		mutationFn: () => dataService.transactionImports.approve(importId!),
		onError: error => showToast(error.message, "negative"),
		onSuccess: async result => {
			await Promise.all([
				invalidate(),
				queryClient.invalidateQueries({ queryKey: ["accounts"] }),
				queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
				queryClient.invalidateQueries({ queryKey: ["transactions"] }),
			]);
			onOpenChange(false);
			showToast(`${result.created} transações importadas.`, "positive");
		},
	});
	const discard = useMutation({
		mutationFn: () => dataService.transactionImports.delete(importId!),
		onError: error => showToast(error.message, "negative"),
		onSuccess: async () => {
			await invalidate();
			onOpenChange(false);
			showToast("Importação descartada.", "info");
		},
	});
	const accountNames = new Map(
		(accounts.data ?? []).map(account => [
			account.id,
			account.name || account.institution?.name || "Conta sem nome",
		]),
	);
	const selectedCount = transactionImport.data?.items.filter(item => item.isSelected).length ?? 0;

	return (
		<>
			<Dialog onOpenChange={onOpenChange} open={open}>
				<DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-2xl">
					<DialogHeader>
						<DialogTitle>Revisar importação</DialogTitle>
						<DialogDescription>
							{transactionImport.data
								? `${transactionImport.data.fileName} · ${selectedCount} transações serão importadas.`
								: "Carregando transações importadas…"}
						</DialogDescription>
					</DialogHeader>
					{transactionImport.isPending || accounts.isPending ? (
						<div className="space-y-3">
							{[1, 2, 3].map(item => (
								<Skeleton className="h-24 rounded-2xl" key={item} />
							))}
						</div>
					) : transactionImport.isError || accounts.isError ? (
						<EmptyState
							description="Tente novamente em instantes."
							icon={<LuCircleAlert className="size-7" />}
							title="Não foi possível carregar a importação"
						/>
					) : transactionImport.data ? (
						<ScrollArea className="min-h-0 pr-3">
							<div className="space-y-5">
								{Object.entries(
									transactionImport.data.items.reduce<Record<string, TransactionImportItem[]>>(
										(groups, item) => {
											const date = item.date.slice(0, 10);
											const itemsForDate = groups[date] ?? [];
											itemsForDate.push(item);
											groups[date] = itemsForDate;
											return groups;
										},
										{},
									),
								).map(([date, items]) => (
									<section className="space-y-2" key={date}>
										<h3 className="font-medium text-muted-foreground text-sm">{formatLocalDate(date)}</h3>
										<div className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
											{items.map(item => (
												<TransactionListItem
													actionItems={[
														{ icon: <LuPencil />, onClick: () => setEditingItem(item), text: "Editar" },
														{
															icon: item.isSelected ? <LuToggleRight /> : <LuToggleLeft />,
															onClick: () =>
																updateItem.mutate({ data: { isSelected: !item.isSelected }, item }),
															text: item.isSelected ? "Ignorar" : "Importar",
														},
													]}
													className={item.isSelected ? undefined : "opacity-55"}
													key={item.id}
													metadataPrefix={
														<div className="flex flex-wrap items-center gap-1.5">
															{formatLocalTime(item.time) ? (
																<span className="text-muted-foreground text-xs">
																	{formatLocalTime(item.time)}
																</span>
															) : null}
															{item.duplicateReason ? (
																<span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-amber-700 text-xs">
																	<LuCircleAlert /> Possível duplicata
																</span>
															) : null}
														</div>
													}
													transaction={toTransaction(item, accountNames)}
												/>
											))}
										</div>
									</section>
								))}
							</div>
						</ScrollArea>
					) : null}
					<DialogFooter>
						<ConfirmActionButton
							className="cursor-pointer"
							confirmation="Descartar todo o lote pendente?"
							disabled={discard.isPending}
							onConfirm={() => discard.mutate()}
							variant="outline"
						>
							Descartar lote
						</ConfirmActionButton>
						<Button
							className="cursor-pointer disabled:cursor-not-allowed"
							disabled={!selectedCount || approve.isPending}
							onClick={() => approve.mutate()}
						>
							<LuFileCheck2 /> {approve.isPending ? "Salvando…" : "Salvar importação"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<EditImportedTransactionDialog
				accounts={accounts.data ?? []}
				item={editingItem}
				onOpenChange={nextOpen => !nextOpen && setEditingItem(null)}
				onSubmit={async data => {
					if (!editingItem) return;
					await updateItem.mutateAsync({ data, item: editingItem });
				}}
				open={editingItem !== null}
				pending={updateItem.isPending}
			/>
		</>
	);
}
