import { LuBanknote, LuCreditCard, LuLandmark, LuPiggyBank, LuTrash2, LuWallet } from "react-icons/lu";
import { Badge } from "@/components/ui/Badge";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import type { FinancialAccount, FinancialInstitution } from "@/lib/api";
import { normalizeInstitutionName } from "@/lib/financial-institution";
import { CreateFinancialAccountDialog } from "./CreateFinancialAccountDialog";

const accountType = {
	CASH: { icon: LuBanknote, label: "Dinheiro" },
	CHECKING: { icon: LuLandmark, label: "Conta corrente" },
	CREDIT_CARD: { icon: LuCreditCard, label: "Cartão de crédito" },
	INVESTMENT: { icon: LuWallet, label: "Investimentos" },
	SAVINGS: { icon: LuPiggyBank, label: "Poupança" },
} as const;

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function FinancialAccountCard({
	account,
	institutions,
	onDelete,
	onUpdate,
}: {
	account: FinancialAccount;
	institutions: FinancialInstitution[];
	onDelete: () => void | Promise<void>;
	onUpdate: Parameters<typeof CreateFinancialAccountDialog>[0]["onUpdate"];
}) {
	const config = accountType[account.type];
	const Icon = config.icon;
	const accountRepeatsInstitution =
		account.institution &&
		normalizeInstitutionName(account.name) === normalizeInstitutionName(account.institution.name);
	const accountUsesDefaultName = account.name === config.label;
	return (
		<article className="group rounded-2xl border bg-card p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/30">
			<div className="flex items-start justify-between gap-4">
				<div className="flex min-w-0 items-center gap-3">
					<span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<Icon className="size-5" />
					</span>
					<div className="min-w-0">
						<h2 className="truncate font-bold text-base">
							{accountRepeatsInstitution || accountUsesDefaultName ? config.label : account.name}
						</h2>
						{!accountRepeatsInstitution && !accountUsesDefaultName && (
							<Badge className="mt-1" variant="secondary">
								{config.label}
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
					/>
					<ConfirmActionButton
						aria-label={`Excluir ${account.name}`}
						confirmation={`Excluir ${account.name} permanentemente?`}
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
					<>
						<p className="text-muted-foreground text-xs">Saldo disponível</p>
						<p className="mt-1 font-bold text-lg">Não se aplica</p>
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
		</article>
	);
}
