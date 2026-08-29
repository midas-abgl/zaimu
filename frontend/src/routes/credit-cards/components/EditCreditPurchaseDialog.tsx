import { type SyntheticEvent, useState } from "react";
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
import type { CreditCard, CreditPurchase } from "@/lib/api";
import { getCreditCardDisplayName } from "@/lib/credit-card";

interface CreditPurchaseUpdate {
	creditCardId?: string;
	description: string;
	storeName?: string | null;
	installmentAmount: number;
	purchaseDate: string;
	tagIds: string[];
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
	const [amount, setAmount] = useState(String(purchase.installmentAmount));
	const [date, setDate] = useState(purchase.purchaseDate.slice(0, 10));
	const [tagIds, setTagIds] = useState(purchase.tagIds ?? (purchase.categoryId ? [purchase.categoryId] : []));
	const [storeName, setStoreName] = useDebouncedInput(purchase.storeName ?? "", () => undefined);
	const [selectedCardId, setSelectedCardId] = useState(creditCardId ?? "");
	const numericAmount = Number(amount);

	const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		await onSubmit({
			...(selectedCardId && selectedCardId !== creditCardId && { creditCardId: selectedCardId }),
			description: description.trim(),
			installmentAmount: numericAmount,
			purchaseDate: date,
			storeName: storeName.trim() || null,
			tagIds,
		});
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Editar transação</DialogTitle>
					<DialogDescription>
						As alterações afetam somente esta {purchase.installments > 1 ? "parcela" : "compra"}.
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
					<FormField
						autoComplete="organization"
						id="credit-purchase-store"
						label="Loja"
						name="storeName"
						onChange={event => setStoreName(event.currentTarget.value)}
						placeholder="Ex: Supermercado São José"
						type="text"
						value={storeName}
					/>
					<MoneyField
						id="credit-purchase-amount"
						label={purchase.installments > 1 ? "Valor da parcela" : "Valor"}
						onValueChange={setAmount}
						placeholder="R$ 120,00"
						required
						value={amount}
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
					<TagPicker disabled={pending} onValueChange={setTagIds} value={tagIds} />
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
							disabled={pending || numericAmount <= 0 || !date}
							type="submit"
						>
							{pending ? "Salvando…" : "Salvar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
