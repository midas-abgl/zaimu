import { type SyntheticEvent, useState } from "react";
import { TagPicker } from "@/components/tags";
import { Button } from "@/components/ui/Button";
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
import type { CreditPurchase } from "@/lib/api";

interface CreditPurchaseUpdate {
	description: string;
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
}: {
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
	const numericAmount = Number(amount);

	const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		await onSubmit({
			description: description.trim(),
			installmentAmount: numericAmount,
			purchaseDate: date,
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
					<FormField
						autoComplete="off"
						id="credit-purchase-description"
						label="Descrição"
						name="credit-purchase-description"
						onChange={event => setDescription(event.currentTarget.value)}
						placeholder="Ex: Supermercado do mês"
						required
						type="text"
						value={description}
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
							disabled={pending || !description.trim() || numericAmount <= 0 || !date}
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
