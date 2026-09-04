import { LuArrowRight, LuCreditCard, LuLandmark, LuReceiptText, LuStore, LuUsersRound } from "react-icons/lu";
import { Badge } from "@/components/ui/Badge";
import type { FinancialAccount, Tag } from "@/lib/api";
import { formatLocalMonthYear } from "@/lib/date";
import { getFinancialAccountTypeLabel } from "@/lib/financial-account";

export interface TransactionBadgeAccount {
	id: string;
	name: string;
	type?: FinancialAccount["type"];
}

function getAccountTypeLabel(type?: FinancialAccount["type"]) {
	if (type === "CREDIT_CARD") return "Cartão";
	const label = type ? getFinancialAccountTypeLabel(type) : "Conta";
	return label === "Conta corrente" ? "Conta" : label;
}

export function TransactionBadges({
	accounts,
	creditCardPayment,
	debtPersonName,
	storeName,
	tags,
}: {
	accounts: TransactionBadgeAccount[];
	creditCardPayment?: { cardName: string; statementDate?: string };
	debtPersonName?: string;
	storeName?: string | null;
	tags?: Tag[];
}) {
	return (
		<ul aria-label="Detalhes da transação" className="flex min-w-0 list-none flex-wrap items-center gap-1.5">
			{accounts.map((account, index) => (
				<li className="flex min-w-0 items-center gap-1" key={account.id}>
					{index > 0 ? (
						<LuArrowRight aria-hidden="true" className="size-3 shrink-0 text-muted-foreground" />
					) : null}
					<Badge className="h-7 max-w-full gap-1.5 px-2.5 font-normal" variant="outline">
						{account.type === "CREDIT_CARD" ? (
							<LuCreditCard aria-hidden="true" />
						) : (
							<LuLandmark aria-hidden="true" />
						)}
						<span className="min-w-0 truncate">
							<span className="text-muted-foreground">{getAccountTypeLabel(account.type)}</span>{" "}
							{account.name}
						</span>
					</Badge>
				</li>
			))}
			{creditCardPayment ? (
				<>
					<li className="min-w-0">
						<Badge className="h-7 max-w-full gap-1.5 px-2.5 font-normal" variant="outline">
							<LuCreditCard aria-hidden="true" />
							<span className="min-w-0 truncate">
								<span className="text-muted-foreground">Cartão</span> {creditCardPayment.cardName}
							</span>
						</Badge>
					</li>
					{creditCardPayment.statementDate ? (
						<li className="min-w-0">
							<Badge className="h-7 max-w-full gap-1.5 px-2.5 font-normal" variant="outline">
								<LuReceiptText aria-hidden="true" />
								<span className="min-w-0 truncate">
									<span className="text-muted-foreground">Fatura</span>{" "}
									{formatLocalMonthYear(creditCardPayment.statementDate)}
								</span>
							</Badge>
						</li>
					) : null}
				</>
			) : null}
			{storeName ? (
				<li className="min-w-0">
					<Badge className="h-7 max-w-full gap-1.5 px-2.5 font-normal" variant="outline">
						<LuStore aria-hidden="true" />
						<span className="min-w-0 truncate">
							<span className="text-muted-foreground">Loja</span> {storeName}
						</span>
					</Badge>
				</li>
			) : null}
			{debtPersonName ? (
				<li className="min-w-0">
					<Badge className="h-7 max-w-full gap-1.5 px-2.5 font-normal" variant="outline">
						<LuUsersRound aria-hidden="true" />
						<span className="truncate">
							<span className="text-muted-foreground">Dívida</span> {debtPersonName}
						</span>
					</Badge>
				</li>
			) : null}
			{tags?.map(tag => (
				<li className="min-w-0" key={tag.id}>
					<Badge className="h-7 max-w-44 px-2.5" variant="secondary">
						<span
							aria-hidden="true"
							className="size-2 shrink-0 rounded-full"
							style={{ backgroundColor: tag.color || "var(--primary)" }}
						/>
						<span className="truncate">{tag.name}</span>
					</Badge>
				</li>
			))}
		</ul>
	);
}
