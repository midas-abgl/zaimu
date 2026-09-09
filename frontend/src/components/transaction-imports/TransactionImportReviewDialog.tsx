import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { LuCircleAlert, LuFileCheck2, LuLoaderCircle, LuTrash2 } from "react-icons/lu";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/Tooltip";
import type { Transaction, TransactionImportItem } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import { formatLocalDate } from "@/lib/date";
import { showToast } from "@/stores";
import {
	type DuplicateField,
	DuplicateResolutionDialog,
	type DuplicateResolutionSources,
	type DuplicateSource,
} from "./DuplicateResolutionDialog";
import { EditImportedTransactionDialog } from "./EditImportedTransactionDialog";
import { ImportReviewDateSection } from "./ImportReviewDateSection";
import { ImportReviewTransactionItem } from "./ImportReviewTransactionItem";

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
		type: item.type === "YIELD" ? "INCOME" : item.type,
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
	const [collapsedDateKeys, setCollapsedDateKeys] = useState<Set<string>>(new Set());
	const [collapsedItemIds, setCollapsedItemIds] = useState<Set<string>>(new Set());
	const [decisionsByItemId, setDecisionsByItemId] = useState<Record<string, boolean>>({});
	const [editingItem, setEditingItem] = useState<TransactionImportItem | null>(null);
	const [resolvingItem, setResolvingItem] = useState<TransactionImportItem | null>(null);
	const decisionsByItemIdRef = useRef<Record<string, boolean>>({});
	const transactionImport = useQuery({
		enabled: open && Boolean(importId),
		queryFn: () => dataService.transactionImports.get(importId!),
		queryKey: ["transaction-import", importId],
	});
	const accounts = useQuery({ enabled: open, queryFn: dataService.accounts.getAll, queryKey: ["accounts"] });
	useEffect(() => {
		if (!open) return;
		decisionsByItemIdRef.current = {};
		setCollapsedDateKeys(new Set());
		setCollapsedItemIds(new Set());
		setDecisionsByItemId({});
	}, [importId, open]);
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
	const setDateCollapsed = (date: string, collapsed: boolean) => {
		setCollapsedDateKeys(current => {
			const next = new Set(current);
			if (collapsed) next.add(date);
			else next.delete(date);
			return next;
		});
	};
	const setItemCollapsed = (itemId: string, collapsed: boolean) => {
		setCollapsedItemIds(current => {
			const next = new Set(current);
			if (collapsed) next.add(itemId);
			else next.delete(itemId);
			return next;
		});
	};
	const markItemReviewed = (item: TransactionImportItem, isSelected: boolean) => {
		const nextDecisions = { ...decisionsByItemIdRef.current, [item.id]: isSelected };
		decisionsByItemIdRef.current = nextDecisions;
		setDecisionsByItemId(nextDecisions);
		setItemCollapsed(item.id, true);

		const date = item.date.slice(0, 10);
		const itemsForDate =
			transactionImport.data?.items.filter(candidate => candidate.date.slice(0, 10) === date) ?? [];
		if (itemsForDate.every(candidate => candidate.id in nextDecisions)) setDateCollapsed(date, true);
	};
	const decideItem = async (item: TransactionImportItem, isSelected: boolean) => {
		await updateItem.mutateAsync({ data: { isSelected }, item });
		markItemReviewed(item, isSelected);
	};
	const resolveDuplicate = async (
		item: TransactionImportItem,
		duplicate: NonNullable<TransactionImportItem["duplicate"]>,
		sources: DuplicateResolutionSources,
		keep: DuplicateSource,
	) => {
		const merged = Object.fromEntries(
			Object.entries(sources).map(([field, source]) => [
				field,
				source === "imported" ? item[field as DuplicateField] : duplicate[field as DuplicateField],
			]),
		) as Partial<Pick<TransactionImportItem, DuplicateField>>;
		if (keep === "imported") {
			await updateItem.mutateAsync({ data: { ...merged, isSelected: true }, item });
			if (duplicate.source === "TRANSACTION") await dataService.transactions.delete(duplicate.id);
			else if (duplicate.sourceImportId)
				await dataService.transactionImports.updateItem(duplicate.sourceImportId, duplicate.id, {
					isSelected: false,
				});
		} else {
			if (duplicate.source === "TRANSACTION") {
				const transactionData: Partial<Transaction> = {
					...merged,
					type: merged.type === "YIELD" ? undefined : merged.type,
				};
				await dataService.transactions.update(duplicate.id, transactionData);
			} else if (duplicate.sourceImportId)
				await dataService.transactionImports.updateItem(duplicate.sourceImportId, duplicate.id, merged);
			await updateItem.mutateAsync({ data: { isSelected: false }, item });
		}
		setResolvingItem(null);
		await invalidate();
		markItemReviewed(item, keep === "imported");
		showToast("Duplicata resolvida.", "positive");
	};

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
									<ImportReviewDateSection
										collapsed={collapsedDateKeys.has(date)}
										dateLabel={formatLocalDate(date)}
										itemCount={items.length}
										key={date}
										onCollapsedChange={collapsed => setDateCollapsed(date, collapsed)}
									>
										{items.map(item => (
											<ImportReviewTransactionItem
												collapsed={collapsedItemIds.has(item.id)}
												decision={decisionsByItemId[item.id]}
												disabled={updateItem.isPending}
												item={item}
												key={item.id}
												onCollapsedChange={collapsed => setItemCollapsed(item.id, collapsed)}
												onDecision={isSelected => void decideItem(item, isSelected)}
												onEdit={() => setEditingItem(item)}
												onResolveDuplicate={() => setResolvingItem(item)}
												transaction={toTransaction(item, accountNames)}
											/>
										))}
									</ImportReviewDateSection>
								))}
							</div>
						</ScrollArea>
					) : null}
					<DialogFooter className="flex-row justify-end">
						<Tooltip>
							<TooltipTrigger asChild>
								<span>
									<ConfirmActionButton
										aria-label="Descartar lote"
										className="cursor-pointer disabled:cursor-not-allowed"
										confirmation="Descartar todo o lote pendente?"
										disabled={discard.isPending}
										onConfirm={() => discard.mutate()}
										size="icon"
										variant="outline"
									>
										<LuTrash2 />
									</ConfirmActionButton>
								</span>
							</TooltipTrigger>
							<TooltipContent>Descartar lote</TooltipContent>
						</Tooltip>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									aria-label={approve.isPending ? "Salvando importação" : "Salvar importação"}
									className="cursor-pointer disabled:cursor-not-allowed"
									disabled={!selectedCount || approve.isPending}
									onClick={() => approve.mutate()}
									size="icon"
								>
									{approve.isPending ? <LuLoaderCircle className="animate-spin" /> : <LuFileCheck2 />}
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								{approve.isPending ? "Salvando importação" : "Salvar importação"}
							</TooltipContent>
						</Tooltip>
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
			<DuplicateResolutionDialog
				accountNames={accountNames}
				item={resolvingItem}
				onOpenChange={nextOpen => !nextOpen && setResolvingItem(null)}
				onResolve={resolveDuplicate}
				open={resolvingItem !== null}
			/>
		</>
	);
}
