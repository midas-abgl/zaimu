import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { DebtPersonPicker } from "@/components/debts";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CustomSelect } from "@/components/ui/CustomSelect";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/Dialog";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import type { Transaction } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import {
	compareFinancialAccountsByOptionLabel,
	getFinancialAccountOptionLabel,
} from "@/lib/financial-account";
import { getUpdatedStoreName } from "@/lib/store-name";
import { showToast } from "@/stores";
import { TransactionDetailsFields } from "./TransactionDetailsFields";

function createDraft(transaction: Transaction) {
	return {
		amount: String(transaction.amount),
		date: transaction.date.slice(0, 10),
		debtPersonId: transaction.debtPersonId ?? "",
		destinationFinancialAccountId: transaction.destinationFinancialAccountId ?? "",
		originFinancialAccountId: transaction.originFinancialAccountId ?? "",
		storeName: transaction.storeName ?? "",
		tagIds: transaction.tagIds ?? transaction.tags?.map(tag => tag.id) ?? [],
		time: transaction.time ?? "",
		type: transaction.type,
	};
}

export function EditTransactionDialog({
	onOpenChange,
	open,
	transaction,
}: {
	onOpenChange: (open: boolean) => void;
	open: boolean;
	transaction: Transaction | null;
}) {
	const queryClient = useQueryClient();
	const [draft, setDraft] = useState(() => (transaction ? createDraft(transaction) : null));
	const [isDebt, setIsDebt] = useState(Boolean(transaction?.debtPersonId));
	const [description, setDescription] = useDebouncedInput(transaction?.description ?? "", () => undefined);
	const accountsQuery = useQuery({
		enabled: open,
		queryFn: () => dataService.accounts.getAll(),
		queryKey: ["accounts"],
	});

	useEffect(() => {
		if (!open || !transaction) return;
		setDraft(createDraft(transaction));
		setIsDebt(Boolean(transaction.debtPersonId));
		setDescription(transaction.description ?? "");
	}, [open, setDescription, transaction]);

	const update = useMutation({
		mutationFn: () => {
			if (!transaction || !draft) throw new Error("Transação não encontrada");
			const storeName = getUpdatedStoreName(
				transaction.storeName,
				draft.type === "EXPENSE" ? draft.storeName : null,
			);
			return dataService.transactions.update(transaction.id, {
				amount: Number.parseFloat(draft.amount),
				date: draft.date,
				debtPersonId: isDebt ? draft.debtPersonId || null : null,
				description: description.trim() || undefined,
				destinationFinancialAccountId: draft.destinationFinancialAccountId || null,
				originFinancialAccountId: draft.originFinancialAccountId || null,
				...(storeName !== undefined && { storeName }),
				tagIds: draft.tagIds,
				time: draft.time || null,
				type: draft.type,
			});
		},
		onError: error => showToast(error.message, "negative"),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["accounts"] }),
				queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
				queryClient.invalidateQueries({ queryKey: ["debts"] }),
				queryClient.invalidateQueries({ queryKey: ["transactions"] }),
			]);
			showToast("Transação atualizada.", "positive");
			onOpenChange(false);
		},
	});

	if (!transaction || !draft) return null;
	const balanceAccounts =
		accountsQuery.data
			?.filter(account => account.type !== "CREDIT_CARD")
			.toSorted(compareFinancialAccountsByOptionLabel) ?? [];
	const primaryAccountId =
		draft.type === "INCOME" ? draft.destinationFinancialAccountId : draft.originFinancialAccountId;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Editar transação</DialogTitle>
					<DialogDescription>Altere os dados da movimentação.</DialogDescription>
				</DialogHeader>
				<div className="scrollbar-themed grid min-h-0 gap-4 overflow-y-auto pr-1">
					<TransactionDetailsFields
						amount={draft.amount}
						date={draft.date}
						description={description}
						onAmountChange={amount => setDraft(current => (current ? { ...current, amount } : current))}
						onDateChange={date => setDraft(current => (current ? { ...current, date } : current))}
						onDescriptionChange={setDescription}
						onStoreNameChange={storeName =>
							setDraft(current => (current ? { ...current, storeName } : current))
						}
						onTagIdsChange={tagIds => setDraft(current => (current ? { ...current, tagIds } : current))}
						onTimeChange={time => setDraft(current => (current ? { ...current, time } : current))}
						onTypeChange={type => {
							if (type === "TRANSFER") setIsDebt(false);
							setDraft(current =>
								current
									? {
											...current,
											debtPersonId: type === "TRANSFER" ? "" : current.debtPersonId,
											destinationFinancialAccountId:
												type === "INCOME" ? current.destinationFinancialAccountId : "",
											originFinancialAccountId: type === "INCOME" ? "" : current.originFinancialAccountId,
											type,
										}
									: current,
							);
						}}
						showStore={draft.type === "EXPENSE"}
						storeName={draft.storeName}
						tagIds={draft.tagIds}
						time={draft.time}
						type={draft.type}
					/>
					{draft.type !== "TRANSFER" ? (
						<div className="grid gap-3 rounded-2xl border p-3">
							<label
								className="flex cursor-pointer items-center gap-3 text-sm"
								htmlFor="edit-transaction-is-debt"
							>
								<Checkbox
									checked={isDebt}
									className="cursor-pointer"
									id="edit-transaction-is-debt"
									onCheckedChange={checked => {
										setIsDebt(checked === true);
										if (checked !== true)
											setDraft(current => (current ? { ...current, debtPersonId: "" } : current));
									}}
								/>
								<span>Esta movimentação é de uma dívida</span>
							</label>
							{isDebt ? (
								<DebtPersonPicker
									onValueChange={debtPersonId =>
										setDraft(current => (current ? { ...current, debtPersonId } : current))
									}
									required
									value={draft.debtPersonId}
								/>
							) : null}
						</div>
					) : null}
					{balanceAccounts.length > 0 ? (
						<CustomSelect
							label={draft.type === "INCOME" ? "Conta de destino" : "Conta de origem"}
							onValueChange={accountId =>
								setDraft(current =>
									current
										? current.type === "INCOME"
											? { ...current, destinationFinancialAccountId: accountId }
											: { ...current, originFinancialAccountId: accountId }
										: current,
								)
							}
							options={balanceAccounts.map(account => ({
								label: getFinancialAccountOptionLabel(account),
								value: account.id,
							}))}
							placeholder="Selecione a conta"
							required
							value={primaryAccountId}
						/>
					) : null}
					{draft.type === "TRANSFER" && balanceAccounts.length > 0 ? (
						<CustomSelect
							label="Conta de destino"
							onValueChange={destinationFinancialAccountId =>
								setDraft(current => (current ? { ...current, destinationFinancialAccountId } : current))
							}
							options={balanceAccounts
								.filter(account => account.id !== draft.originFinancialAccountId)
								.map(account => ({ label: getFinancialAccountOptionLabel(account), value: account.id }))}
							placeholder="Selecione o destino"
							required
							value={draft.destinationFinancialAccountId}
						/>
					) : null}
				</div>
				<DialogFooter>
					<Button className="cursor-pointer" onClick={() => onOpenChange(false)} variant="outline">
						Descartar
					</Button>
					<Button
						className="cursor-pointer disabled:cursor-not-allowed"
						disabled={
							!draft.amount ||
							!primaryAccountId ||
							(isDebt && !draft.debtPersonId) ||
							(draft.type === "TRANSFER" && !draft.destinationFinancialAccountId) ||
							update.isPending
						}
						onClick={() => update.mutate()}
					>
						{update.isPending ? "Salvando…" : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
