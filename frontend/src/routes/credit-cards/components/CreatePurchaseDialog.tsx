import { type SyntheticEvent, useState } from "react";
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
import type { Category, CreditCard } from "@/lib/api";

const installments = Array.from({ length: 24 }, (_, index) => ({
	label: index === 0 ? "À vista" : `${index + 1} parcelas`,
	value: String(index + 1),
}));

interface PurchaseDraft {
	categoryId?: string;
	description: string;
	installments?: number;
	purchaseDate: string;
	totalAmount: number;
}

export function CreatePurchaseDialog({
	card,
	categories,
	onOpenChange,
	onSubmit,
	open,
	pending,
}: {
	card: CreditCard | null;
	categories: Category[];
	onOpenChange: (open: boolean) => void;
	onSubmit: (draft: PurchaseDraft) => Promise<void>;
	open: boolean;
	pending: boolean;
}) {
	const [description, setDescription] = useDebouncedInput("", () => undefined);
	const [amount, setAmount] = useState("");
	const [count, setCount] = useState("1");
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [categoryId, setCategoryId] = useState("");
	const total = Number(amount || 0);
	const installmentValue = total / Number(count || 1);

	const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		await onSubmit({
			categoryId: categoryId || undefined,
			description: description.trim(),
			installments: Number(count),
			purchaseDate: date,
			totalAmount: total,
		});
		onOpenChange(false);
		setDescription("");
		setAmount("");
		setCount("1");
		setCategoryId("");
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Registrar compra</DialogTitle>
					<DialogDescription>
						{card?.accountName} · a previsão da fatura é atualizada na hora.
					</DialogDescription>
				</DialogHeader>
				<form className="grid gap-5" onSubmit={submit}>
					<FormField
						autoComplete="off"
						id="purchase-description"
						label="Descrição"
						name="purchase-description"
						onChange={event => setDescription(event.currentTarget.value)}
						placeholder="Ex: Supermercado do mês"
						required
						type="text"
						value={description}
					/>
					<MoneyField
						id="purchase-amount"
						label="Valor total"
						onValueChange={setAmount}
						placeholder="R$ 480,00"
						required
						value={amount}
					/>
					<div className="grid gap-4 sm:grid-cols-2">
						<CustomSelect
							label="Parcelamento"
							onValueChange={setCount}
							options={installments}
							placeholder="Selecione"
							required
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
					<CustomSelect
						label="Categoria"
						onValueChange={setCategoryId}
						options={[
							{ label: "Sem categoria", value: "none" },
							...categories.map(category => ({ label: category.name, value: category.id })),
						]}
						placeholder="Selecione uma categoria"
						value={categoryId || "none"}
					/>
					{Number(count) > 1 && total > 0 && (
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
						<Button disabled={pending || !description.trim() || total <= 0} type="submit">
							{pending ? "Salvando…" : "Salvar compra"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
