import { LuLandmark, LuWalletCards } from "react-icons/lu";
import { Badge } from "@/components/ui/Badge";
import type { FinancialAccount, FinancialInstitution } from "@/lib/api";
import { CreateFinancialAccountDialog } from "./CreateFinancialAccountDialog";
import { FinancialAccountCard } from "./FinancialAccountCard";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function FinancialInstitutionGroup({
	accounts,
	institution,
	institutions,
	onCreate,
	onDelete,
	pending,
}: {
	accounts: FinancialAccount[];
	institution: FinancialInstitution | null;
	institutions: FinancialInstitution[];
	onCreate: Parameters<typeof CreateFinancialAccountDialog>[0]["onCreate"];
	onDelete: (account: FinancialAccount) => void | Promise<void>;
	pending: boolean;
}) {
	const balance = accounts
		.filter(account => account.type !== "CREDIT_CARD")
		.reduce((total, account) => total + (account.balance ?? 0), 0);
	const Icon = institution ? LuLandmark : LuWalletCards;

	return (
		<section className="grid gap-4 rounded-3xl border bg-card/35 p-4 shadow-card sm:p-5">
			<header className="flex flex-wrap items-center justify-between gap-4 border-border/70 border-b pb-4">
				<div className="flex min-w-0 items-center gap-3">
					<span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
						<Icon className="size-5" />
					</span>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<h2 className="truncate font-bold text-lg">{institution?.name ?? "Sem instituição"}</h2>
							<Badge variant="secondary">
								{accounts.length} {accounts.length === 1 ? "produto" : "produtos"}
							</Badge>
						</div>
						<p className="mt-0.5 text-muted-foreground text-sm">
							Saldo consolidado: <strong className="text-foreground">{currency.format(balance)}</strong>
						</p>
					</div>
				</div>
				<CreateFinancialAccountDialog
					contextual
					defaultInstitutionId={institution?.id ?? null}
					institutions={institutions}
					onCreate={onCreate}
					pending={pending}
				/>
			</header>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{accounts.map(account => (
					<FinancialAccountCard account={account} key={account.id} onDelete={() => onDelete(account)} />
				))}
			</div>
		</section>
	);
}
