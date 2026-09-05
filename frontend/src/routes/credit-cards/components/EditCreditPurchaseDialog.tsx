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
import type { CreditCard, CreditPurchase } from "@/lib/api";
import { getCreditCardDisplayName } from "@/lib/credit-card";
import { getUpdatedStoreName } from "@/lib/store-name";

interface CreditPurchaseUpdate {
	creditCardId?: string;
	description: string;
	debtPersonId?: null | string;
	installments: number;
	storeName?: string | null;
	purchaseDate: string;
	time?: string | null;
	tagIds: string[];
	totalAmount: number;
}

export function EditCreditPurchaseDialog({
	onOpenChange,
	onSubmit,
	open,
	pending,
	purchase,
	cards,
	creditCardId,
}: {
	cards?: CreditCard[];
	creditCardId?: string;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: CreditPurchaseUpdate) => Promise<void>;
	open: boolean;
	pending: boolean;
	purchase: CreditPurchase;
}) {
	const [description, setDescription] = useDebouncedInput(purchase.description, () => undefined);
	const [debtPersonId, setDebtPersonId] = useState(purchase.debtPersonId ?? "");
	const [isDebt, setIsDebt] = useState(Boolean(purchase.debtPersonId));
	const [amount, setAmount] = useState(String(purchase.totalAmount));
	const [count, setCount] = useDebouncedInput(String(purchase.installments), () => undefined);
	const [date, setDate] = useState(purchase.purchaseDate.slice(0, 10));
	const [time, setTime] = useState(purchase.time ?? "");
	const [tagIds, setTagIds] = useState(purchase.tagIds ?? (purchase.categoryId ? [purchase.categoryId] : []));
	const [storeName, setStoreName] = useState(purchase.storeName ?? "");
	const [selectedCardId, setSelectedCardId] = useState(creditCardId ?? "");

	useEffect(() => {
		if (!open) return;
		setStoreName(purchase.storeName ?? "");
		setDebtPersonId(purchase.debtPersonId ?? "");
		setIsDebt(Boolean(purchase.debtPersonId));
		setTime(purchase.time ?? "");
	}, [open, purchase.debtPersonId, purchase.storeName, purchase.time]);
	const totalAmount = Number(amount);
	const installments = Number.parseInt(count, 10);
	const installmentAmount = totalAmount / (installments || 1);

	const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		const updatedStoreName = getUpdatedStoreName(purchase.storeName, storeName);
		await onSubmit({
			...(selectedCardId && selectedCardId !== creditCardId && { creditCardId: selectedCardId }),
			debtPersonId: isDebt ? debtPersonId : null,
			description: description.trim(),
			installments,
			purchaseDate: date,
			...(updatedStoreName !== undefined && { storeName: updatedStoreName }),
			tagIds,
			time: time || null,
			totalAmount,
		});
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[92dvh] overflow-hidden p-0 sm:max-w-lg">
				<ScrollArea className="max-h-[92dvh]">
					<div className="grid gap-6 p-6">
						<DialogHeader>
							<DialogTitle>Editar compra</DialogTitle>
							<DialogDescription>
								As alterações afetam a compra inteira e suas próximas parcelas.
							</DialogDescription>
						</DialogHeader>
						<form className="grid gap-5" onSubmit={submit}>
							{cards?.length && creditCardId ? (
								<CustomSelect
									label="Cartão"
									onValueChange={setSelectedCardId}
									options={cards.map(card => ({ label: getCreditCardDisplayName(card), value: card.id }))}
									placeholder="Selecione o cartão"
									required
									value={selectedCardId}
								/>
							) : null}
							<FormField
								autoComplete="off"
								id="credit-purchase-description"
								label="Descrição"
								name="credit-purchase-description"
								onChange={event => setDescription(event.currentTarget.value)}
								placeholder="Ex: Supermercado do mês"
								type="text"
								value={description}
							/>
							<StorePicker onValueChange={setStoreName} value={storeName} />
							<MoneyField
								id="credit-purchase-amount"
								label="Valor total"
								onValueChange={setAmount}
								placeholder="R$ 120,00"
								required
								value={amount}
							/>
							<div className="grid gap-4 sm:grid-cols-3">
								<FormField
									autoComplete="off"
									id="credit-purchase-installments"
									inputMode="numeric"
									label="Parcelas"
									name="credit-purchase-installments"
									onChange={event => setCount(event.currentTarget.value.replace(/\D/g, "").slice(0, 2))}
									placeholder="Ex: 12"
									required
									type="text"
									value={count}
								/>
								<DateField
									autoComplete="off"
									id="credit-purchase-date"
									label="Data da compra"
									name="credit-purchase-date"
									onChange={event => setDate(event.currentTarget.value)}
									required
									value={date}
								/>
								<FormField
									id="credit-purchase-time"
									label="Horário (opcional)"
									name="credit-purchase-time"
									onChange={event => setTime(event.currentTarget.value)}
									type="time"
									value={time}
								/>
							</div>
							{installments > 1 && totalAmount > 0 ? (
								<div className="rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm">
									<strong>
										{installments}x de{" "}
										{new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(
											installmentAmount,
										)}
									</strong>
								</div>
							) : null}
							<TagPicker disabled={pending} onValueChange={setTagIds} value={tagIds} />
							<div className="grid gap-3 rounded-2xl border p-3">
								<label
									className="flex cursor-pointer items-center gap-3 text-sm"
									htmlFor="edit-purchase-is-debt"
								>
									<Checkbox
										checked={isDebt}
										className="cursor-pointer"
										id="edit-purchase-is-debt"
										onCheckedChange={checked => {
											setIsDebt(checked === true);
											if (checked !== true) setDebtPersonId("");
										}}
									/>
									<span>Esta compra é de uma dívida</span>
								</label>
								{isDebt ? (
									<DebtPersonPicker onValueChange={setDebtPersonId} required value={debtPersonId} />
								) : null}
							</div>
							<DialogFooter>
								<Button
									className="cursor-pointer"
									onClick={() => onOpenChange(false)}
									type="button"
									variant="outline"
								>
									Descartar
								</Button>
								<Button
									className="cursor-pointer"
									disabled={
										pending ||
										(isDebt && !debtPersonId) ||
										totalAmount <= 0 ||
										!Number.isInteger(installments) ||
										installments < 1 ||
										installments > 48 ||
										!date
									}
									type="submit"
								>
									{pending ? "Salvando…" : "Salvar"}
								</Button>
							</DialogFooter>
						</form>
					</div>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
