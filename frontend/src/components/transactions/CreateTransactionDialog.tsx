import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { TagPicker } from "@/components/tags";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DateField } from "@/components/ui/DateField";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { MoneyField } from "@/components/ui/MoneyField";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import type { Transaction } from "@/lib/api";
import { getCreditCardDisplayName } from "@/lib/credit-card";
import { dataService } from "@/lib/dataService";
import { formatLocalDate } from "@/lib/date";
import { getFinancialAccountDisplayName } from "@/lib/financial-account";
import { showToast } from "@/stores";

const initialDraft = () => ({
	amount: "",
	creditCardStatementId: "",
	date: new Date().toISOString().slice(0, 10),
	destinationFinancialAccountId: "",
	originFinancialAccountId: "",
	tagIds: [] as string[],
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
	const [description, setDescription] = useDebouncedInput("", () => undefined);
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
			return statements.flatMap(({ card, statements }) => statements.map(statement => ({ card, statement })));
		},
		queryKey: ["credit-card-statements", "payable"],
	});
	const balanceAccounts =
		accountsQuery.data
			?.filter(account => account.type !== "CREDIT_CARD")
			.toSorted((left, right) =>
				getFinancialAccountDisplayName(left).localeCompare(getFinancialAccountDisplayName(right), "pt-BR"),
			) ?? [];
	const selectedStatement = payableStatementsQuery.data?.find(
		item => item.statement.id === draft.creditCardStatementId,
	);
	const primaryAccountId =
		draft.type === "INCOME" ? draft.destinationFinancialAccountId : draft.originFinancialAccountId;
	const reset = () => {
		setDraft(initialDraft());
		setDescription("");
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
					},
				);
			}
			const transaction = await dataService.transactions.create({
				amount,
				date: draft.date,
				description: description.trim() || undefined,
				destinationFinancialAccountId: draft.destinationFinancialAccountId || undefined,
				originFinancialAccountId: draft.originFinancialAccountId || undefined,
				tagIds: draft.tagIds,
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
					<CustomSelect
						label="Tipo"
						onValueChange={value =>
							setDraft(current => ({
								...current,
								creditCardStatementId: value === "EXPENSE" ? current.creditCardStatementId : "",
								type: value as Transaction["type"],
							}))
						}
						options={[
							{ label: "Saída", value: "EXPENSE" },
							{ label: "Entrada", value: "INCOME" },
							{ label: "Transferência", value: "TRANSFER" },
						]}
						placeholder="Selecione o tipo"
						required
						value={draft.type}
					/>
					<MoneyField
						id="transaction-amount"
						label="Valor"
						onValueChange={amount => setDraft(current => ({ ...current, amount }))}
						required
						value={draft.amount}
					/>
					{!selectedStatement && (
						<FormField
							autoComplete="off"
							id="transaction-description"
							label="Descrição"
							name="description"
							onChange={event => setDescription(event.currentTarget.value)}
							placeholder="Ex: Mercado do mês"
							type="text"
							value={description}
						/>
					)}
					<DateField
						id="transaction-date"
						label="Data"
						name="date"
						onChange={event => {
							const date = event.currentTarget.value;
							setDraft(current => ({ ...current, date }));
						}}
						required
						value={draft.date}
					/>
					{draft.type === "EXPENSE" && payableStatementsQuery.data?.length ? (
						<CustomSelect
							label="Fatura para pagar"
							onValueChange={creditCardStatementId =>
								setDraft(current => ({ ...current, creditCardStatementId }))
							}
							options={payableStatementsQuery.data.map(({ card, statement }) => ({
								label: `${getCreditCardDisplayName(card)} · ${formatLocalDate(statement.dueDate)} · ${new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(statement.totalAmount - statement.paidAmount)}`,
								value: statement.id,
							}))}
							placeholder="Nenhuma fatura selecionada"
							value={draft.creditCardStatementId}
						/>
					) : null}
					{draft.type !== "TRANSFER" && !selectedStatement && (
						<TagPicker
							onValueChange={tagIds => setDraft(current => ({ ...current, tagIds }))}
							value={draft.tagIds}
						/>
					)}
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
								label: getFinancialAccountDisplayName(account),
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
								.map(account => ({ label: getFinancialAccountDisplayName(account), value: account.id }))}
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
