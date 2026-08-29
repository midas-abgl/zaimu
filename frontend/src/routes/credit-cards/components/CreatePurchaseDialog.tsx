import { type SyntheticEvent, useState } from "react";
import { StorePicker } from "@/components/stores";
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
import type { CreditCard } from "@/lib/api";
import { getCreditCardDisplayName } from "@/lib/credit-card";

interface PurchaseDraft {
	description: string;
	storeName?: string;
	installments?: number;
	purchaseDate: string;
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
	const [amount, setAmount] = useState("");
	const [count, setCount] = useDebouncedInput("1", () => undefined);
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [tagIds, setTagIds] = useState<string[]>([]);
	const [storeName, setStoreName] = useState("");
	const [cardId, setCardId] = useState(initialCardId ?? "");
	const total = Number(amount || 0);
	const installmentCount = Number.parseInt(count, 10);
	const installmentValue = total / (installmentCount || 1);

	const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 48) return;
		await onSubmit(cardId, {
			description: description.trim(),
			installments: installmentCount,
			purchaseDate: date,
			storeName: storeName.trim() || undefined,
			tagIds,
			totalAmount: total,
		});
		onOpenChange(false);
		setDescription("");
		setAmount("");
		setCount("1");
		setTagIds([]);
		setStoreName("");
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-lg">
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
					<div className="grid gap-4 sm:grid-cols-2">
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
					</div>
					<TagPicker onValueChange={setTagIds} value={tagIds} />
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
						<Button onClick={() => onOpenChange(false)} type="button" variant="outline">
							Descartar
						</Button>
						<Button
							disabled={
								pending ||
								!cardId ||
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
			</DialogContent>
		</Dialog>
	);
}
