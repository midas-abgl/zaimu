import { type SyntheticEvent, useState } from "react";
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
import { MoneyField } from "@/components/ui/MoneyField";
import type { CreditPurchase } from "@/lib/api";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function RefundCreditPurchaseDialog({
	onOpenChange,
	onSubmit,
	open,
	pending,
	purchase,
}: {
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { amount?: number; date?: string }) => Promise<unknown>;
	open: boolean;
	pending: boolean;
	purchase: CreditPurchase;
}) {
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState("");
	const amountValue = amount ? Number(amount) : undefined;

	const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		await onSubmit({ ...(amountValue !== undefined && { amount: amountValue }), ...(date && { date }) });
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Registrar reembolso</DialogTitle>
					<DialogDescription>
						Deixe o valor em branco para devolver {currency.format(Math.abs(purchase.totalAmount))}. Sem data,
						o crédito entra junto da compra original.
					</DialogDescription>
				</DialogHeader>
				<form className="grid gap-5" onSubmit={submit}>
					<MoneyField
						id="credit-purchase-refund-amount"
						label="Valor do reembolso (opcional)"
						onValueChange={setAmount}
						placeholder="R$ 120,00"
						value={amount}
					/>
					<DateField
						autoComplete="off"
						id="credit-purchase-refund-date"
						label="Data do reembolso (opcional)"
						name="credit-purchase-refund-date"
						onChange={event => setDate(event.currentTarget.value)}
						value={date}
					/>
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
							disabled={pending || (amountValue !== undefined && amountValue <= 0)}
							type="submit"
						>
							{pending ? "Registrando…" : "Registrar reembolso"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
