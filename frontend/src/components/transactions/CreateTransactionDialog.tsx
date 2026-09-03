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
import { getCreditCardDisplayName } from "@/lib/credit-card";
import { dataService } from "@/lib/dataService";
import { formatLocalDate, getCurrentLocalTime } from "@/lib/date";
import {
	compareFinancialAccountsByOptionLabel,
	getFinancialAccountOptionLabel,
} from "@/lib/financial-account";
import { showToast } from "@/stores";
import { TransactionDetailsFields } from "./TransactionDetailsFields";

const initialDraft = () => ({
	amount: "",
	creditCardStatementId: "",
	date: new Date().toISOString().slice(0, 10),
	debtPersonId: "",
	destinationFinancialAccountId: "",
	originFinancialAccountId: "",
	storeName: "",
	tagIds: [] as string[],
	time: getCurrentLocalTime(),
	type: "EXPENSE" as Transaction["type"],
});

export function CreateTransactionDialog({
	onOpenChange,
	open,
}: {
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const queryClient = useQueryClient();
	const [draft, setDraft] = useState(initialDraft);
	const [isDebt, setIsDebt] = useState(false);
	const [useExistingEvent, setUseExistingEvent] = useState(false);
	const [description, setDescription] = useDebouncedInput("", () => undefined);
	const [sendWithoutTime, setSendWithoutTime] = useState(false);
	useEffect(() => {
		if (!open) return;
		setDraft(current => ({ ...current, time: getCurrentLocalTime() }));
		setSendWithoutTime(false);
	}, [open]);
	const accountsQuery = useQuery({ queryFn: () => dataService.accounts.getAll(), queryKey: ["accounts"] });
	const payableStatementsQuery = useQuery({
		enabled: open && draft.type === "EXPENSE",
		queryFn: async () => {
			const cards = await dataService.creditCards.getAll();
			const statements = await Promise.all(
				cards.map(async card => ({
					card,
					statements: await dataService.creditCards.getStatements(card.id, false),
				})),
			);
			return statements
				.flatMap(({ card, statements }) =>
					statements.filter(statement => !statement.isPaid).map(statement => ({ card, statement })),
				)
				.toSorted((left, right) => {
					const leftDueDate = new Date(left.statement.dueDate);
					const rightDueDate = new Date(right.statement.dueDate);
					const monthOrder =
						leftDueDate.getFullYear() * 12 +
						leftDueDate.getMonth() -
						(rightDueDate.getFullYear() * 12 + rightDueDate.getMonth());

					if (monthOrder !== 0) return monthOrder;

					return getCreditCardDisplayName(left.card).localeCompare(
						getCreditCardDisplayName(right.card),
						"pt-BR",
					);
				});
		},
		queryKey: ["credit-card-statements", "payable"],
	});
	const ledgerQuery = useQuery({
		enabled: open && isDebt,
		queryFn: () => dataService.debts.getLedger(),
		queryKey: ["debts"],
	});
	const debtPairCandidate = ledgerQuery.data?.people
		.find(person => person.id === draft.debtPersonId)
		?.events.find(
			event =>
				!event.createdByMe &&
				event.amount === Number(draft.amount) &&
				event.date.slice(0, 10) === draft.date.slice(0, 10) &&
				event.effect === (draft.type === "INCOME" ? -Number(draft.amount) : Number(draft.amount)),
		);
	useEffect(() => setUseExistingEvent(false), [debtPairCandidate?.id]);
	const balanceAccounts =
		accountsQuery.data
			?.filter(account => account.type !== "CREDIT_CARD" && account.type !== "REWARDS")
			.toSorted(compareFinancialAccountsByOptionLabel) ?? [];
	const selectedStatement = payableStatementsQuery.data?.find(
		item => item.statement.id === draft.creditCardStatementId,
	);
	const primaryAccountId =
		draft.type === "INCOME" ? draft.destinationFinancialAccountId : draft.originFinancialAccountId;
	const reset = () => {
		setDraft(initialDraft());
		setDescription("");
		setIsDebt(false);
		setUseExistingEvent(false);
		setSendWithoutTime(false);
	};
	const handleOpenChange = (nextOpen: boolean) => {
		onOpenChange(nextOpen);
		if (!nextOpen) reset();
	};
	const create = useMutation({
		mutationFn: async () => {
			const amount = Number.parseFloat(draft.amount);
			if (selectedStatement) {
				return dataService.creditCards.payStatement(
					selectedStatement.card.id,
					selectedStatement.statement.id,
					{
						amount,
						date: draft.date,
						financialAccountId: draft.originFinancialAccountId,
						time: sendWithoutTime ? null : draft.time || undefined,
					},
				);
			}
			const transaction = await dataService.transactions.create({
				amount,
				date: draft.date,
				debtPersonId: draft.debtPersonId || undefined,
				description: description.trim() || undefined,
				destinationFinancialAccountId: draft.destinationFinancialAccountId || undefined,
				matchDebtEventId: useExistingEvent ? debtPairCandidate?.id : undefined,
				originFinancialAccountId: draft.originFinancialAccountId || undefined,
				storeName: draft.type === "EXPENSE" ? draft.storeName.trim() || undefined : undefined,
				tagIds: draft.tagIds,
				time: sendWithoutTime ? null : draft.time || undefined,
				type: draft.type,
			});
			return { statement: null, transaction };
		},
		onError: error => showToast(error.message, "negative"),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["transactions"] }),
				queryClient.invalidateQueries({ queryKey: ["accounts"] }),
				queryClient.invalidateQueries({ queryKey: ["credit-card-statements"] }),
				queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
				queryClient.invalidateQueries({ queryKey: ["debts"] }),
			]);
			showToast(selectedStatement ? "Pagamento da fatura registrado." : "Transação registrada.", "positive");
			handleOpenChange(false);
		},
	});

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className="max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Nova transação</DialogTitle>
					<DialogDescription>Informe os dados da movimentação.</DialogDescription>
				</DialogHeader>
				<div className="scrollbar-themed grid min-h-0 gap-4 overflow-y-auto pr-1">
					<TransactionDetailsFields
						amount={draft.amount}
						date={draft.date}
						description={description}
						onAmountChange={amount => setDraft(current => ({ ...current, amount }))}
						onDateChange={date => setDraft(current => ({ ...current, date }))}
						onDescriptionChange={setDescription}
						onSendWithoutTimeChange={setSendWithoutTime}
						onStoreNameChange={storeName => setDraft(current => ({ ...current, storeName }))}
						onTagIdsChange={tagIds => setDraft(current => ({ ...current, tagIds }))}
						onTimeChange={time => setDraft(current => ({ ...current, time }))}
						onTypeChange={type => {
							if (type === "TRANSFER") setIsDebt(false);
							setDraft(current => ({
								...current,
								creditCardStatementId: type === "EXPENSE" ? current.creditCardStatementId : "",
								debtPersonId: type === "TRANSFER" ? "" : current.debtPersonId,
								type,
							}));
						}}
						sendWithoutTime={sendWithoutTime}
						showDescription={!selectedStatement}
						showStore={draft.type === "EXPENSE" && !selectedStatement}
						showTags={draft.type !== "TRANSFER" && !selectedStatement}
						storeName={draft.storeName}
						tagIds={draft.tagIds}
						time={draft.time}
						type={draft.type}
					/>
					{draft.type === "EXPENSE" && payableStatementsQuery.data?.length ? (
						<CustomSelect
							label="Fatura para pagar"
							onValueChange={creditCardStatementId => {
								setDraft(current => ({ ...current, creditCardStatementId, debtPersonId: "" }));
								setIsDebt(false);
							}}
							options={payableStatementsQuery.data.map(({ card, statement }) => ({
								label: `${getCreditCardDisplayName(card)} · ${formatLocalDate(statement.dueDate)} · ${new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(statement.totalAmount - statement.paidAmount)}`,
								value: statement.id,
							}))}
							placeholder="Nenhuma fatura selecionada"
							sortOptions={false}
							value={draft.creditCardStatementId}
						/>
					) : null}
					{draft.type !== "TRANSFER" && !selectedStatement ? (
						<div className="grid gap-3 rounded-2xl border p-3">
							<label className="flex cursor-pointer items-center gap-3 text-sm" htmlFor="transaction-is-debt">
								<Checkbox
									checked={isDebt}
									className="cursor-pointer"
									id="transaction-is-debt"
									onCheckedChange={checked => {
										setIsDebt(checked === true);
										if (checked !== true) setDraft(current => ({ ...current, debtPersonId: "" }));
									}}
								/>
								<span>Esta movimentação é de uma dívida</span>
							</label>
							{isDebt ? (
								<>
									<DebtPersonPicker
										onValueChange={debtPersonId => setDraft(current => ({ ...current, debtPersonId }))}
										required
										value={draft.debtPersonId}
									/>
									{debtPairCandidate ? (
										<label
											className="flex cursor-pointer items-start gap-3 rounded-xl bg-primary/5 p-3 text-sm"
											htmlFor="transaction-use-debt-event"
										>
											<Checkbox
												checked={useExistingEvent}
												className="mt-0.5 cursor-pointer"
												id="transaction-use-debt-event"
												onCheckedChange={checked => setUseExistingEvent(checked === true)}
											/>
											<span>
												<strong>Usar lançamento já compartilhado</strong>
												<span className="block text-muted-foreground text-xs">
													Mesmo valor e data. O pareamento não altera o saldo novamente.
												</span>
											</span>
										</label>
									) : null}
								</>
							) : null}
						</div>
					) : null}
					{balanceAccounts.length > 0 && (
						<CustomSelect
							label={
								draft.type === "INCOME"
									? "Conta de destino"
									: draft.type === "TRANSFER"
										? "Conta de origem"
										: "Conta"
							}
							onValueChange={accountId =>
								setDraft(current =>
									current.type === "INCOME"
										? { ...current, destinationFinancialAccountId: accountId, originFinancialAccountId: "" }
										: {
												...current,
												destinationFinancialAccountId:
													current.type === "TRANSFER" ? current.destinationFinancialAccountId : "",
												originFinancialAccountId: accountId,
											},
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
					)}
					{draft.type === "TRANSFER" && balanceAccounts.length > 0 && (
						<CustomSelect
							label="Conta de destino"
							onValueChange={destinationFinancialAccountId =>
								setDraft(current => ({ ...current, destinationFinancialAccountId }))
							}
							options={balanceAccounts
								.filter(account => account.id !== draft.originFinancialAccountId)
								.map(account => ({ label: getFinancialAccountOptionLabel(account), value: account.id }))}
							placeholder="Selecione o destino"
							required
							value={draft.destinationFinancialAccountId}
						/>
					)}
				</div>
				<DialogFooter>
					<Button className="cursor-pointer" onClick={() => handleOpenChange(false)} variant="outline">
						Descartar
					</Button>
					<Button
						className="cursor-pointer disabled:cursor-not-allowed"
						disabled={
							!draft.amount ||
							!primaryAccountId ||
							(isDebt && !draft.debtPersonId) ||
							(selectedStatement &&
								Number.parseFloat(draft.amount) >
									selectedStatement.statement.totalAmount - selectedStatement.statement.paidAmount) ||
							(draft.type === "TRANSFER" && !draft.destinationFinancialAccountId) ||
							create.isPending
						}
						onClick={() => create.mutate()}
					>
						{create.isPending ? "Salvando…" : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
