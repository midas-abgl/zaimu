import { LuArrowRight, LuCreditCard, LuLandmark } from "react-icons/lu";
import { Badge } from "@/components/ui/Badge";
import type { Transaction } from "@/lib/api";
import { getFinancialAccountTypeLabel } from "@/lib/financial-account";

export function TransactionAccounts({ transaction }: { transaction: Transaction }) {
	const isCreditCard = transaction.source === "CREDIT_CARD";
	const originName = transaction.originName || transaction.sourceName;
	const destinationName =
		transaction.destinationName || (transaction.type === "INCOME" ? transaction.sourceName : undefined);
	const originLabel = transaction.originAccountType
		? `Origem · ${getFinancialAccountTypeLabel(transaction.originAccountType)}`
		: "Origem";
	const destinationLabel = transaction.destinationAccountType
		? `Destino · ${getFinancialAccountTypeLabel(transaction.destinationAccountType)}`
		: "Destino";
	const accountType =
		transaction.type === "INCOME" ? transaction.destinationAccountType : transaction.originAccountType;
	const accounts =
		transaction.type === "TRANSFER"
			? [
					{
						id: transaction.originFinancialAccountId || "origin",
						label: originLabel,
						name: originName || "Conta de origem",
					},
					{
						id: transaction.destinationFinancialAccountId || "destination",
						label: destinationLabel,
						name: destinationName || "Conta de destino",
					},
				]
			: [
					{
						id:
							transaction.originFinancialAccountId || transaction.destinationFinancialAccountId || "account",
						label: isCreditCard
							? "Cartão"
							: accountType
								? getFinancialAccountTypeLabel(accountType)
								: "Conta",
						name: (transaction.type === "INCOME" ? destinationName : originName) || "Conta sem nome",
					},
				];

	return (
		<ul
			aria-label="Contas relacionadas"
			className="mt-1.5 flex min-w-0 list-none flex-wrap items-center gap-1"
		>
			{accounts.map((account, index) => (
				<li className="flex min-w-0 items-center gap-1" key={`${account.label}-${account.id}`}>
					{index > 0 ? (
						<LuArrowRight aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
					) : null}
					<Badge className="h-6 max-w-full gap-1.5 font-normal" variant="outline">
						{isCreditCard ? <LuCreditCard aria-hidden="true" /> : <LuLandmark aria-hidden="true" />}
						<span className="text-muted-foreground">{account.label}:</span>
						<span className="truncate">{account.name}</span>
					</Badge>
				</li>
			))}
		</ul>
	);
}
