import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import { MoneyField } from "@/components/ui/MoneyField";
import type { CreditCard, CreditCardStatement } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import { getFinancialAccountDisplayName } from "@/lib/financial-account";

export function PayStatementDialog({
	card,
	onOpenChange,
	onSubmit,
	open,
	pending,
	statement,
}: {
	card: CreditCard;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: { amount: number; date: string; financialAccountId: string }) => Promise<void>;
	open: boolean;
	pending: boolean;
	statement: CreditCardStatement;
}) {
	const outstandingAmount = statement.totalAmount - statement.paidAmount;
	const [amount, setAmount] = useState(String(outstandingAmount));
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [financialAccountId, setFinancialAccountId] = useState("");
	const accounts = useQuery({ queryFn: () => dataService.accounts.getAll(), queryKey: ["accounts"] });
	const balanceAccounts = accounts.data?.filter(account => account.type !== "CREDIT_CARD") ?? [];
	const paymentAmount = Number(amount);

	const submit = async () => {
		await onSubmit({ amount: paymentAmount, date, financialAccountId });
	};

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Pagar fatura</DialogTitle>
					<DialogDescription>
						Registra uma saída na conta escolhida e baixa a fatura de {card.accountName || "seu cartão"}.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-5">
					<MoneyField
						id="statement-payment-amount"
						label="Valor do pagamento"
						onValueChange={setAmount}
						required
						value={amount}
					/>
					<DateField
						id="statement-payment-date"
						label="Data do pagamento"
						name="statement-payment-date"
						onChange={event => setDate(event.currentTarget.value)}
						required
						value={date}
					/>
					<CustomSelect
						label="Conta de pagamento"
						onValueChange={setFinancialAccountId}
						options={balanceAccounts.map(account => ({
							label: getFinancialAccountDisplayName(account),
							value: account.id,
						}))}
						placeholder="Selecione a conta"
						required
						value={financialAccountId}
					/>
				</div>
				<DialogFooter>
					<Button className="cursor-pointer" onClick={() => onOpenChange(false)} variant="outline">
						Descartar
					</Button>
					<Button
						className="cursor-pointer disabled:cursor-not-allowed"
						disabled={
							pending ||
							!financialAccountId ||
							!date ||
							paymentAmount <= 0 ||
							paymentAmount > outstandingAmount
						}
						onClick={submit}
					>
						{pending ? "Registrando…" : "Pagar fatura"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
