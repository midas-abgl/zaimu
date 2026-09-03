import { useState } from "react";
import {
	LuBanknote,
	LuCreditCard,
	LuLandmark,
	LuPiggyBank,
	LuReceiptText,
	LuSparkles,
	LuTrash2,
	LuWallet,
} from "react-icons/lu";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import type { FinancialAccount, FinancialInstitution } from "@/lib/api";
import {
	getFinancialAccountCurrencyValue,
	getFinancialAccountDisplayName,
	getFinancialAccountTypeLabel,
} from "@/lib/financial-account";
import { normalizeInstitutionName } from "@/lib/financial-institution";
import { CreateFinancialAccountDialog } from "./CreateFinancialAccountDialog";
import { CreditCardAccountSummary } from "./CreditCardAccountSummary";
import { FinancialAccountStatementDialog } from "./FinancialAccountStatementDialog";

const accountType = {
	CASH: { icon: LuBanknote },
	CHECKING: { icon: LuLandmark },
	CREDIT_CARD: { icon: LuCreditCard },
	INVESTMENT: { icon: LuWallet },
	REWARDS: { icon: LuSparkles },
	SAVINGS: { icon: LuPiggyBank },
} as const;

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });
const points = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 });

export function FinancialAccountCard({
	account,
	institutions,
	onDelete,
	onUpdate,
	rewardAccounts,
}: {
	account: FinancialAccount;
	institutions: FinancialInstitution[];
	onDelete: () => void | Promise<void>;
	onUpdate: Parameters<typeof CreateFinancialAccountDialog>[0]["onUpdate"];
	rewardAccounts: FinancialAccount[];
}) {
	const [statementOpen, setStatementOpen] = useState(false);
	const config = accountType[account.type];
	const Icon = config.icon;
	const accountRepeatsInstitution =
		account.name?.trim() &&
		account.institution &&
		normalizeInstitutionName(account.name) === normalizeInstitutionName(account.institution.name);
	const displayName = getFinancialAccountDisplayName(account);
	const typeLabel = getFinancialAccountTypeLabel(account.type);
	const listName = account.name?.trim() && !accountRepeatsInstitution ? displayName : typeLabel;
	return (
		<article className="group rounded-2xl border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30">
			<div className="flex items-start justify-between gap-4">
				<div className="flex min-w-0 items-center gap-3">
					<span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<Icon className="size-5" />
					</span>
					<div className="min-w-0">
						<h2 className="truncate font-bold text-base">{listName}</h2>
						{account.name?.trim() && !accountRepeatsInstitution && (
							<Badge className="mt-1" variant="secondary">
								{typeLabel}
							</Badge>
						)}
					</div>
				</div>
				<div className="flex gap-2">
					<CreateFinancialAccountDialog
						account={account}
						contextual
						iconOnly
						institutions={institutions}
						onCreate={async () => undefined}
						onUpdate={onUpdate}
						pending={false}
						rewardAccounts={rewardAccounts}
					/>
					<ConfirmActionButton
						aria-label={`Excluir ${displayName}`}
						confirmation={`Excluir ${displayName} permanentemente?`}
						onConfirm={onDelete}
						size="icon-sm"
						variant="destructive"
					>
						<LuTrash2 />
					</ConfirmActionButton>
				</div>
			</div>
			<div className="mt-6 border-border/70 border-t pt-4">
				{account.type === "CREDIT_CARD" ? (
					<CreditCardAccountSummary card={account.creditCard} />
				) : account.type === "REWARDS" ? (
					<>
						<p className="text-muted-foreground text-xs">
							{account.rewardsAccount?.kind === "CASHBACK" ? "Cashback disponível" : "Pontos acumulados"}
						</p>
						<p className="mt-1 font-bold text-2xl">
							{account.rewardsAccount?.kind === "CASHBACK"
								? currency.format(account.balance ?? 0)
								: `${points.format(account.balance ?? 0)} pontos`}
						</p>
						{account.rewardsAccount?.kind === "POINTS" && account.rewardsAccount.conversionPoints ? (
							<p className="mt-1 text-muted-foreground text-sm">
								Equivalente a {currency.format(getFinancialAccountCurrencyValue(account))}
							</p>
						) : null}
					</>
				) : (
					<>
						<p className="text-muted-foreground text-xs">Saldo disponível</p>
						<p
							className={
								(account.balance ?? 0) < 0
									? "mt-1 font-bold text-2xl text-destructive"
									: "mt-1 font-bold text-2xl"
							}
						>
							{currency.format(account.balance ?? 0)}
						</p>
					</>
				)}
			</div>
			{account.type !== "CREDIT_CARD" && account.type !== "REWARDS" ? (
				<>
					<Button
						className="mt-4 w-full cursor-pointer"
						onClick={() => setStatementOpen(true)}
						size="sm"
						variant="outline"
					>
						<LuReceiptText /> Extrato
					</Button>
					<FinancialAccountStatementDialog
						account={account}
						onOpenChange={setStatementOpen}
						open={statementOpen}
					/>
				</>
			) : null}
		</article>
	);
}
