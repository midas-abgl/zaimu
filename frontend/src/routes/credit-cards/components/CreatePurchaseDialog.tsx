import { useQuery } from "@tanstack/react-query";
import { type SyntheticEvent, useEffect, useState } from "react";
import { DebtPersonPicker } from "@/components/debts";
import { StorePicker } from "@/components/stores";
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
import { FormField } from "@/components/ui/FormField";
import { MoneyField } from "@/components/ui/MoneyField";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import type { CreditCard } from "@/lib/api";
import { getCreditCardDisplayName } from "@/lib/credit-card";
import { dataService } from "@/lib/dataService";
import { getCurrentLocalTime } from "@/lib/date";

interface PurchaseDraft {
	debtPersonId?: string;
	description: string;
	storeName?: string;
	installments?: number;
	matchDebtEventId?: string;
	purchaseDate: string;
	time?: string | null;
	tagIds?: string[];
	totalAmount: number;
}

export function CreatePurchaseDialog({
	cards,
	initialCardId,
	onOpenChange,
	onSubmit,
	open,
	pending,
}: {
	cards: CreditCard[];
	initialCardId?: string;
	onOpenChange: (open: boolean) => void;
	onSubmit: (cardId: string, draft: PurchaseDraft) => Promise<void>;
	open: boolean;
	pending: boolean;
}) {
	const [description, setDescription] = useDebouncedInput("", () => undefined);
	const [debtPersonId, setDebtPersonId] = useState("");
	const [isDebt, setIsDebt] = useState(false);
	const [useExistingEvent, setUseExistingEvent] = useState(false);
	const [amount, setAmount] = useState("");
	const [count, setCount] = useDebouncedInput("1", () => undefined);
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [time, setTime] = useState(getCurrentLocalTime());
	const [sendWithoutTime, setSendWithoutTime] = useState(false);
	useEffect(() => {
		if (!open) return;
		setTime(getCurrentLocalTime());
		setSendWithoutTime(false);
	}, [open]);
	const [tagIds, setTagIds] = useState<string[]>([]);
	const [storeName, setStoreName] = useState("");
	const [cardId, setCardId] = useState(initialCardId ?? "");
	const total = Number(amount || 0);
	const installmentCount = Number.parseInt(count, 10);
	const installmentValue = total / (installmentCount || 1);
	const ledgerQuery = useQuery({
		enabled: open && isDebt,
		queryFn: () => dataService.debts.getLedger(),
		queryKey: ["debts"],
	});
	const debtPairCandidate = ledgerQuery.data?.people
		.find(person => person.id === debtPersonId)
		?.events.find(
			event =>
				!event.createdByMe &&
				event.amount === total &&
				event.date?.slice(0, 10) === date &&
				event.effect === total,
		);
	useEffect(() => setUseExistingEvent(false), [debtPairCandidate?.id]);
	const reset = () => {
		setDescription("");
		setDebtPersonId("");
		setIsDebt(false);
		setUseExistingEvent(false);
		setAmount("");
		setCount("1");
		setDate(new Date().toISOString().slice(0, 10));
		setTime(getCurrentLocalTime());
		setSendWithoutTime(false);
		setTagIds([]);
		setStoreName("");
		setCardId(initialCardId ?? "");
	};
	const handleOpenChange = (nextOpen: boolean) => {
		onOpenChange(nextOpen);
		if (!nextOpen) reset();
	};

	const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 48) return;
		await onSubmit(cardId, {
			debtPersonId: isDebt ? debtPersonId : undefined,
			description: description.trim(),
			installments: installmentCount,
			matchDebtEventId: useExistingEvent ? debtPairCandidate?.id : undefined,
			purchaseDate: date,
			storeName: storeName.trim() || undefined,
			tagIds,
			time: sendWithoutTime ? null : time || undefined,
			totalAmount: total,
		});
		handleOpenChange(false);
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className="max-h-[92dvh] overflow-hidden p-0 sm:max-w-lg">
				<ScrollArea className="max-h-[92dvh]">
					<div className="grid gap-6 p-6">
						<DialogHeader>
							<DialogTitle>Nova compra</DialogTitle>
							<DialogDescription>A previsão da fatura é atualizada na hora.</DialogDescription>
						</DialogHeader>
						<form className="grid gap-5" onSubmit={submit}>
							<CustomSelect
								label="Cartão"
								onValueChange={setCardId}
								options={cards.map(card => ({ label: getCreditCardDisplayName(card), value: card.id }))}
								placeholder="Selecione o cartão"
								required
								value={cardId}
							/>
							<FormField
								autoComplete="off"
								id="purchase-description"
								label="Descrição"
								name="purchase-description"
								onChange={event => setDescription(event.currentTarget.value)}
								placeholder="Ex: Supermercado do mês"
								type="text"
								value={description}
							/>
							<StorePicker onValueChange={setStoreName} value={storeName} />
							<MoneyField
								id="purchase-amount"
								label="Valor total"
								onValueChange={setAmount}
								placeholder="R$ 480,00"
								required
								value={amount}
							/>
							<div className="grid gap-4 sm:grid-cols-3">
								<FormField
									autoComplete="off"
									description="Informe 1 para compra à vista."
									id="purchase-installments"
									inputMode="numeric"
									label="Parcelas"
									name="purchase-installments"
									onChange={event => setCount(event.currentTarget.value.replace(/\D/g, "").slice(0, 2))}
									placeholder="Ex: 12"
									required
									type="text"
									value={count}
								/>
								<DateField
									autoComplete="off"
									id="purchase-date"
									label="Data da compra"
									name="purchase-date"
									onChange={event => setDate(event.currentTarget.value)}
									required
									value={date}
								/>
								<FormField
									disabled={sendWithoutTime}
									id="purchase-time"
									label="Horário"
									name="purchase-time"
									onChange={event => setTime(event.currentTarget.value)}
									type="time"
									value={sendWithoutTime ? "" : time}
								/>
							</div>
							<label
								className="flex cursor-pointer items-start gap-3 text-sm"
								htmlFor="purchase-without-time"
							>
								<Checkbox
									checked={sendWithoutTime}
									className="mt-0.5 cursor-pointer"
									id="purchase-without-time"
									onCheckedChange={checked => setSendWithoutTime(checked === true)}
								/>
								<span className="font-medium text-foreground-muted">Enviar sem horário</span>
							</label>
							<TagPicker onValueChange={setTagIds} value={tagIds} />
							<div className="grid gap-3 rounded-2xl border p-3">
								<label className="flex cursor-pointer items-center gap-3 text-sm" htmlFor="purchase-is-debt">
									<Checkbox
										checked={isDebt}
										className="cursor-pointer"
										id="purchase-is-debt"
										onCheckedChange={checked => {
											setIsDebt(checked === true);
											if (checked !== true) setDebtPersonId("");
										}}
									/>
									<span>Esta compra é de uma dívida</span>
								</label>
								{isDebt ? (
									<>
										<DebtPersonPicker onValueChange={setDebtPersonId} required value={debtPersonId} />
										{debtPairCandidate ? (
											<label
												className="flex cursor-pointer items-start gap-3 rounded-xl bg-primary/5 p-3 text-sm"
												htmlFor="purchase-use-debt-event"
											>
												<Checkbox
													checked={useExistingEvent}
													className="mt-0.5 cursor-pointer"
													id="purchase-use-debt-event"
													onCheckedChange={checked => setUseExistingEvent(checked === true)}
												/>
												<span>
													<strong>Usar lançamento já compartilhado</strong>
													<span className="block text-muted-foreground text-xs">
														Mesmo valor e data. A compra não altera o saldo novamente.
													</span>
												</span>
											</label>
										) : null}
									</>
								) : null}
							</div>
							{installmentCount > 1 && total > 0 && (
								<div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm">
									<strong>
										{count}x de{" "}
										{new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(
											installmentValue,
										)}
									</strong>
									<p className="mt-1 text-muted-foreground">Cada parcela entra na fatura correspondente.</p>
								</div>
							)}
							<DialogFooter>
								<Button onClick={() => handleOpenChange(false)} type="button" variant="outline">
									Descartar
								</Button>
								<Button
									disabled={
										pending ||
										!cardId ||
										(isDebt && !debtPersonId) ||
										total <= 0 ||
										!Number.isInteger(installmentCount) ||
										installmentCount < 1 ||
										installmentCount > 48
									}
									type="submit"
								>
									{pending ? "Salvando…" : "Salvar compra"}
								</Button>
							</DialogFooter>
						</form>
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
