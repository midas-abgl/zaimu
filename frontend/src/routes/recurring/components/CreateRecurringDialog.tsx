import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { TagPicker } from "@/components/tags";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
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
import type { RecurringPayment, Salary, Subscription } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import {
	compareFinancialAccountsByDisplayName,
	getFinancialAccountDisplayName,
} from "@/lib/financial-account";
import { showToast } from "@/stores";
import { frequencyOptions, paymentMethodOptions, sourceOptions } from "./constants";
import { DebouncedFormField } from "./DebouncedFormField";
import { DebouncedMoneyField } from "./DebouncedMoneyField";
import { PastTransactionsDialog } from "./PastTransactionsDialog";
import { getPastRecurrenceDates } from "./recurrence-dates";
import type { RecurrenceFrequency, RecurringDraft, RecurringListItemData, RecurringSource } from "./types";

const initialDraft = (item?: RecurringListItemData): RecurringDraft => ({
	amount: item ? String(item.amount) : "",
	day: item?.day ? String(item.day) : "",
	financialAccountId: item?.financialAccountId ?? "",
	frequency: item?.frequency ?? "MONTHLY",
	name: item?.title ?? "",
	paymentMethod: item?.paymentMethod ?? "CREDIT",
	source: item?.source ?? "subscription",
	startDate: item?.startDate.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
	tagIds: item?.tags?.map(tag => tag.id) ?? [],
});

const noFinancialAccountValue = "__no-financial-account__";

const successMessages: Record<RecurringSource, string> = {
	recurring: "Recorrência criada.",
	salary: "Salário criado.",
	subscription: "Assinatura criada.",
};

export function CreateRecurringDialog({
	onOpenChange,
	open,
	item,
}: {
	onOpenChange: (open: boolean) => void;
	open: boolean;
	item?: RecurringListItemData;
}) {
	const queryClient = useQueryClient();
	const [draft, setDraft] = useState(() => initialDraft(item));
	const [updateUneditedTransactions, setUpdateUneditedTransactions] = useState(true);
	const isEditing = Boolean(item);
	const [isPastTransactionsDialogOpen, setIsPastTransactionsDialogOpen] = useState(false);
	const accountsQuery = useQuery({ queryFn: () => dataService.accounts.getAll(), queryKey: ["accounts"] });
	const balanceAccounts =
		accountsQuery.data
			?.filter(account => account.type !== "CREDIT_CARD")
			.toSorted(compareFinancialAccountsByDisplayName) ?? [];
	const compatibleAccounts =
		draft.source === "salary" || draft.paymentMethod !== "CREDIT"
			? balanceAccounts
			: (accountsQuery.data
					?.filter(account => account.type === "CREDIT_CARD")
					.toSorted(compareFinancialAccountsByDisplayName) ?? []);
	useEffect(() => {
		if (draft.financialAccountId || compatibleAccounts.length !== 1) return;
		setDraft(current =>
			current.financialAccountId ? current : { ...current, financialAccountId: compatibleAccounts[0].id },
		);
	}, [compatibleAccounts, draft.financialAccountId]);
	const setField = <Key extends keyof RecurringDraft>(field: Key, value: RecurringDraft[Key]) => {
		setDraft(current => ({ ...current, [field]: value }));
	};
	const handleOpenChange = (nextOpen: boolean) => {
		onOpenChange(nextOpen);
		if (!nextOpen) {
			setDraft(initialDraft(item));
			setIsPastTransactionsDialogOpen(false);
		}
	};

	const create = useMutation<RecurringPayment | Salary | Subscription, Error, boolean>({
		mutationFn: async (addPastTransactions = false) => {
			const amount = Number.parseFloat(draft.amount);
			const day = Number.parseInt(draft.day, 10);
			if (item) {
				if (item.source === "salary") {
					return dataService.salaries.update(item.id, {
						amount,
						financialAccountId: draft.financialAccountId,
						frequency: draft.frequency,
						payDay: day,
						source: draft.name.trim(),
						updateUneditedTransactions,
					});
				}
				if (item.source === "subscription") {
					return dataService.subscriptions.update(item.id, {
						amount,
						billingDay: day,
						financialAccountId: draft.financialAccountId || null,
						frequency: draft.frequency,
						name: draft.name.trim(),
						paymentMethod: draft.paymentMethod,
					});
				}
				return dataService.recurringPayments.update(item.id, {
					amount,
					dayOfMonth: day,
					financialAccountId: draft.financialAccountId || null,
					frequency: draft.frequency,
					name: draft.name.trim(),
					paymentMethod: draft.paymentMethod,
					tagIds: draft.tagIds,
					updateUneditedTransactions,
				});
			}
			if (draft.source === "salary") {
				const autoGenerateFrom = addPastTransactions ? draft.startDate : format(new Date(), "yyyy-MM-dd");
				const salary = await dataService.salaries.create({
					amount,
					autoGenerateFrom,
					financialAccountId: draft.financialAccountId,
					frequency: draft.frequency,
					payDay: day,
					source: draft.name.trim(),
					startDate: draft.startDate,
				});
				if (addPastTransactions) {
					await Promise.all(
						getPastRecurrenceDates(draft.frequency, draft.startDate, day).map(date =>
							dataService.transactions.create({
								amount,
								date,
								description: draft.name.trim(),
								destinationFinancialAccountId: draft.financialAccountId,
								salaryId: salary.id,
								salaryOccurrenceDate: date,
								type: "INCOME",
							}),
						),
					);
				}
				return salary;
			}
			if (draft.source === "subscription") {
				const subscription = await dataService.subscriptions.create({
					amount,
					billingDay: day,
					financialAccountId: draft.financialAccountId || undefined,
					frequency: draft.frequency,
					name: draft.name.trim(),
					paymentMethod: draft.paymentMethod,
					startDate: draft.startDate,
				});
				if (addPastTransactions) {
					await Promise.all(
						getPastRecurrenceDates(draft.frequency, draft.startDate, day).map(date =>
							dataService.transactions.create({
								amount,
								date,
								description: draft.name.trim(),
								subscriptionId: subscription.id,
								subscriptionOccurrenceDate: date,
								type: "EXPENSE",
							}),
						),
					);
				}
				return subscription;
			}
			const payment = await dataService.recurringPayments.create({
				amount,
				dayOfMonth: day,
				financialAccountId: draft.financialAccountId || undefined,
				frequency: draft.frequency,
				name: draft.name.trim(),
				paymentMethod: draft.paymentMethod,
				startDate: draft.startDate,
				tagIds: draft.tagIds,
			});
			if (addPastTransactions) {
				await Promise.all(
					getPastRecurrenceDates(draft.frequency, draft.startDate, day).map(date =>
						dataService.transactions.create({
							amount,
							date,
							description: draft.name.trim(),
							recurrenceId: payment.id,
							type: "EXPENSE",
						}),
					),
				);
			}
			return payment;
		},
		onError: error => showToast(error.message, "negative"),
		onSuccess: async (_, addPastTransactions) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["recurring-payments"] }),
				queryClient.invalidateQueries({ queryKey: ["salaries"] }),
				queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
				queryClient.invalidateQueries({ queryKey: ["transactions"] }),
				queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
			]);
			showToast(
				isEditing
					? updateUneditedTransactions && (draft.source === "recurring" || draft.source === "salary")
						? "Recorrência e histórico automático atualizados."
						: "Recorrência atualizada."
					: addPastTransactions
						? `${successMessages[draft.source].replace(".", "")} e transações passadas adicionadas.`
						: successMessages[draft.source],
				"positive",
			);
			handleOpenChange(false);
		},
	});

	const nameLabel = draft.source === "salary" ? "Fonte da renda" : "Nome";
	const namePlaceholder =
		draft.source === "salary"
			? "Ex: Empresa Exemplo"
			: draft.source === "subscription"
				? "Ex: Streaming"
				: "Ex: Aluguel";
	const dayLabel = draft.source === "salary" ? "Dia do pagamento" : "Dia da cobrança";
	const day = Number.parseInt(draft.day, 10);
	const dayError = draft.day && (day < 1 || day > 31) ? "Informe um dia entre 1 e 31." : undefined;
	const requiresFinancialAccount = draft.source === "salary" || draft.paymentMethod === "CREDIT";
	const canSubmit =
		draft.name.trim() &&
		draft.amount &&
		draft.day &&
		!dayError &&
		draft.startDate &&
		(!requiresFinancialAccount || draft.financialAccountId);
	const isStartDateInPast = draft.startDate < format(new Date(), "yyyy-MM-dd");
	const handleSave = () => {
		if (!isEditing && isStartDateInPast) {
			setIsPastTransactionsDialogOpen(true);
			return;
		}
		create.mutate(false);
	};

	return (
		<>
			<Dialog onOpenChange={handleOpenChange} open={open}>
				<DialogContent className="max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg">
					<DialogHeader>
						<DialogTitle>{isEditing ? "Editar recorrência" : "Nova recorrência"}</DialogTitle>
						<DialogDescription>
							{isEditing
								? "Atualize os dados da recorrência."
								: "Cadastre uma entrada ou saída que se repete."}
						</DialogDescription>
					</DialogHeader>
					<div className="scrollbar-themed grid min-h-0 gap-4 overflow-y-auto pr-1">
						{!isEditing && (
							<CustomSelect
								label="Tipo"
								onValueChange={value =>
									setDraft(current => ({
										...current,
										financialAccountId: "",
										source: value as RecurringSource,
									}))
								}
								options={sourceOptions}
								placeholder="Selecione o tipo"
								required
								value={draft.source}
							/>
						)}
						<DebouncedFormField
							autoComplete={draft.source === "salary" ? "organization" : "off"}
							id="recurring-name"
							label={nameLabel}
							name={draft.source === "salary" ? "organization" : "recurring-name"}
							onValueChange={value => setField("name", value)}
							placeholder={namePlaceholder}
							required
							type="text"
							value={draft.name}
						/>
						<div className="grid gap-4">
							<DebouncedMoneyField
								id="recurring-amount"
								label="Valor"
								onValueChange={value => setField("amount", value)}
								required
								value={draft.amount}
							/>
						</div>
						{draft.source === "salary" && (
							<CustomSelect
								label="Conta de destino"
								onValueChange={value => setField("financialAccountId", value)}
								options={compatibleAccounts.map(account => ({
									label: getFinancialAccountDisplayName(account),
									value: account.id,
								}))}
								placeholder={accountsQuery.isPending ? "Carregando contas…" : "Selecione a conta"}
								required
								value={draft.financialAccountId}
							/>
						)}
						<div className="grid gap-4 sm:grid-cols-2">
							<CustomSelect
								label="Frequência"
								onValueChange={value => setField("frequency", value as RecurrenceFrequency)}
								options={frequencyOptions}
								placeholder="Selecione a frequência"
								required
								value={draft.frequency}
							/>
							<DebouncedFormField
								autoComplete="off"
								error={dayError}
								id="recurring-day"
								inputMode="numeric"
								label={dayLabel}
								maxLength={2}
								name="recurring-day"
								onValueChange={value => setField("day", value.replace(/\D/g, "").slice(0, 2))}
								placeholder="Ex: 10"
								required
								type="text"
								value={draft.day}
							/>
						</div>
						{draft.source !== "salary" && (
							<CustomSelect
								label="Forma de pagamento"
								onValueChange={value =>
									setDraft(current => ({
										...current,
										financialAccountId: "",
										paymentMethod: value as RecurringDraft["paymentMethod"],
									}))
								}
								options={[...paymentMethodOptions]}
								placeholder="Selecione a forma"
								required
								value={draft.paymentMethod}
							/>
						)}
						{draft.source !== "salary" && compatibleAccounts.length > 0 && (
							<CustomSelect
								label={draft.paymentMethod === "CREDIT" ? "Cartão de cobrança" : "Conta de saída"}
								onValueChange={value =>
									setField("financialAccountId", value === noFinancialAccountValue ? "" : value)
								}
								options={[
									...(draft.paymentMethod === "CREDIT"
										? []
										: [{ label: "Sem conta específica", value: noFinancialAccountValue }]),
									...compatibleAccounts.map(account => ({
										label: getFinancialAccountDisplayName(account),
										value: account.id,
									})),
								]}
								placeholder={
									accountsQuery.isPending
										? "Carregando contas…"
										: draft.paymentMethod === "CREDIT"
											? "Selecione o cartão"
											: "Selecione a conta"
								}
								required={draft.paymentMethod === "CREDIT"}
								value={
									draft.financialAccountId ||
									(draft.paymentMethod === "CREDIT" ? undefined : noFinancialAccountValue)
								}
							/>
						)}
						{!isEditing && (
							<DateField
								id="recurring-start-date"
								label="Data inicial"
								name="start-date"
								onChange={event => setField("startDate", event.currentTarget.value)}
								required
								value={draft.startDate}
							/>
						)}
						{draft.source === "recurring" && (
							<TagPicker onValueChange={tagIds => setField("tagIds", tagIds)} value={draft.tagIds} />
						)}
						{isEditing && draft.source !== "subscription" && (
							<label
								className="flex cursor-pointer items-start gap-3 rounded-xl border p-3"
								htmlFor="update-automatic-history"
							>
								<Checkbox
									checked={updateUneditedTransactions}
									id="update-automatic-history"
									onCheckedChange={checked => setUpdateUneditedTransactions(checked === true)}
								/>
								<span className="space-y-0.5 text-sm">
									<span className="block font-medium">Atualizar histórico automático</span>
									<span className="block text-muted-foreground">
										Atualiza valor, nome e dia das transações sem edição manual.
									</span>
								</span>
							</label>
						)}
					</div>
					<DialogFooter>
						<Button className="cursor-pointer" onClick={() => handleOpenChange(false)} variant="outline">
							Descartar
						</Button>
						<Button
							className="cursor-pointer disabled:cursor-not-allowed"
							disabled={!canSubmit || create.isPending}
							onClick={handleSave}
						>
							{create.isPending ? "Salvando…" : "Salvar"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
			<PastTransactionsDialog
				onAddAll={() => {
					setIsPastTransactionsDialogOpen(false);
					create.mutate(true);
				}}
				onOpenChange={setIsPastTransactionsDialogOpen}
				onSkip={() => {
					setIsPastTransactionsDialogOpen(false);
					create.mutate(false);
				}}
				open={isPastTransactionsDialogOpen}
			/>
		</>
	);
}
