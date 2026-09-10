import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { LuCircleAlert, LuFileCheck2, LuLoaderCircle, LuTrash2 } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
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
import { formatLocalDate } from "@/lib/date";
import { showToast } from "@/stores";
import { DuplicateResolutionDialog, type DuplicateResolutionSources } from "./DuplicateResolutionDialog";
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
	const [approvingItemIds, setApprovingItemIds] = useState<Set<string>>(new Set());
	const [discardConfirmationOpen, setDiscardConfirmationOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<TransactionImportItem | null>(null);
	const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
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
		setApprovingItemIds(new Set());
		setDiscardConfirmationOpen(false);
		setDuplicateWarningOpen(false);
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
		mutationFn: async (duplicateItemIds: string[] = []) => {
			await Promise.all(
				duplicateItemIds.map(itemId =>
					dataService.transactionImports.updateItem(importId!, itemId, { isSelected: false }),
				),
			);
			return dataService.transactionImports.approve(importId!);
		},
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
	const approveItem = useMutation({
		mutationFn: (itemId: string) => dataService.transactionImports.approveItem(importId!, itemId),
		onError: error => showToast(error.message, "negative"),
		onMutate: itemId => {
			setApprovingItemIds(current => new Set(current).add(itemId));
		},
		onSettled: (_data, _error, itemId) => {
			setApprovingItemIds(current => {
				const next = new Set(current);
				next.delete(itemId);
				return next;
			});
		},
		onSuccess: async () => {
			await Promise.all([
				invalidate(),
				queryClient.invalidateQueries({ queryKey: ["accounts"] }),
				queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
				queryClient.invalidateQueries({ queryKey: ["transactions"] }),
			]);
			showToast("Transação aprovada.", "positive");
		},
	});
	const discard = useMutation({
		mutationFn: () => dataService.transactionImports.delete(importId!),
		onError: error => showToast(error.message, "negative"),
		onSuccess: async () => {
			await invalidate();
			setDiscardConfirmationOpen(false);
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
	const unresolvedDuplicateItems =
		transactionImport.data?.items.filter(item => item.isSelected && item.duplicateReason) ?? [];
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
		if (!isSelected) setItemCollapsed(item.id, true);
	};
	const decideItem = async (item: TransactionImportItem, isSelected: boolean) => {
		await updateItem.mutateAsync({ data: { isSelected }, item });
		markItemReviewed(item, isSelected);
	};
	const finishImport = () => {
		if (unresolvedDuplicateItems.length) {
			setDuplicateWarningOpen(true);
			return;
		}
		approve.mutate([]);
	};
	const resolveDuplicate = async (
		item: TransactionImportItem,
		duplicate: NonNullable<TransactionImportItem["duplicate"]>,
		sources: DuplicateResolutionSources,
	) => {
		await dataService.transactionImports.reconcileItem(importId!, item.id, {
			duplicateId: duplicate.id,
			duplicateSource: duplicate.source,
			sources,
		});
		setResolvingItem(null);
		await invalidate();
		markItemReviewed(item, false);
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
												disabled={updateItem.isPending || approvingItemIds.has(item.id)}
												item={item}
												key={item.id}
												onApprove={() => approveItem.mutate(item.id)}
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
						<Button
							className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/80 disabled:cursor-not-allowed"
							disabled={discard.isPending || approve.isPending || approvingItemIds.size > 0}
							onClick={() => setDiscardConfirmationOpen(true)}
						>
							<LuTrash2 /> Descartar lote
						</Button>
						<Button
							className="cursor-pointer disabled:cursor-not-allowed"
							disabled={approve.isPending || approvingItemIds.size > 0 || discard.isPending}
							onClick={finishImport}
						>
							{approve.isPending ? <LuLoaderCircle className="animate-spin" /> : <LuFileCheck2 />}
							{approve.isPending ? "Salvando…" : "Salvar e finalizar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog onOpenChange={setDuplicateWarningOpen} open={duplicateWarningOpen}>
				<DialogContent showCloseButton={!approve.isPending}>
					<DialogHeader>
						<DialogTitle>Possíveis duplicatas encontradas</DialogTitle>
						<DialogDescription>
							Há {unresolvedDuplicateItems.length}{" "}
							{unresolvedDuplicateItems.length === 1 ? "transação" : "transações"} com possível duplicata. Se
							continuar,{" "}
							{unresolvedDuplicateItems.length === 1 ? "ela será ignorada" : "elas serão ignoradas"}.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							disabled={approve.isPending || approvingItemIds.size > 0}
							onClick={() => setDuplicateWarningOpen(false)}
							variant="outline"
						>
							Voltar
						</Button>
						<Button
							disabled={approve.isPending || approvingItemIds.size > 0}
							onClick={() => approve.mutate(unresolvedDuplicateItems.map(item => item.id))}
						>
							{approve.isPending ? <LuLoaderCircle className="animate-spin" /> : <LuFileCheck2 />}
							Continuar e ignorar
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<Dialog onOpenChange={setDiscardConfirmationOpen} open={discardConfirmationOpen}>
				<DialogContent showCloseButton={false}>
					<DialogHeader>
						<DialogTitle>Excluir importação?</DialogTitle>
						<DialogDescription>
							Esta ação excluirá todo o lote importado e não poderá ser desfeita.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							disabled={discard.isPending}
							onClick={() => setDiscardConfirmationOpen(false)}
							variant="outline"
						>
							Fechar modal
						</Button>
						<Button
							className="bg-destructive text-destructive-foreground hover:bg-destructive/80"
							disabled={discard.isPending}
							onClick={() => discard.mutate()}
						>
							<LuTrash2 /> {discard.isPending ? "Excluindo…" : "Excluir lote"}
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
