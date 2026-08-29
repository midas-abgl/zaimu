import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { LuLandmark, LuWalletCards } from "react-icons/lu";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageContainer } from "@/components/ui/PageContainer";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import type { FinancialAccount, FinancialInstitution } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import { getFinancialInstitutions } from "@/lib/financial-institution";
import { showToast, useAuthStore } from "@/stores";
import { CreateFinancialAccountDialog, FinancialInstitutionGroup } from "./accounts/components";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

function AccountsPage() {
	const queryClient = useQueryClient();
	const hasAccess = useAuthStore(state => state.isAuthenticated || state.isGuestMode);
	const accounts = useQuery({
		enabled: hasAccess,
		queryFn: () => dataService.accounts.getAll(),
		queryKey: ["financial-accounts"],
	});
	const invalidateAccountData = async () => {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: ["financial-accounts"] }),
			queryClient.invalidateQueries({ queryKey: ["credit-cards"] }),
			queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
		]);
	};
	const createAccount = useMutation({
		mutationFn: dataService.accounts.create,
		onError: error => showToast(error.message, "negative"),
		onSuccess: async () => {
			await invalidateAccountData();
			showToast("Conta cadastrada.", "positive");
		},
	});
	const deleteAccount = useMutation({
		mutationFn: dataService.accounts.delete,
		onError: error => showToast(error.message, "negative"),
		onSuccess: async () => {
			await invalidateAccountData();
			showToast("Conta excluída.", "positive");
		},
	});
	const updateAccount = useMutation({
		mutationFn: ({ data, id }: { id: string; data: Parameters<typeof dataService.accounts.update>[1] }) =>
			dataService.accounts.update(id, data),
		onError: error => showToast(error.message, "negative"),
		onSuccess: async () => {
			await invalidateAccountData();
			showToast("Conta atualizada.", "positive");
		},
	});
	const updateInstitution = useMutation({
		mutationFn: ({ id, name }: { id: string; name: string }) =>
			dataService.financialInstitutions.update(id, name),
		onError: error => showToast(error.message, "negative"),
		onSuccess: async () => {
			await invalidateAccountData();
			showToast("Instituição atualizada.", "positive");
		},
	});
	const deleteInstitution = useMutation({
		mutationFn: dataService.financialInstitutions.delete,
		onError: error => showToast(error.message, "negative"),
		onSuccess: async () => {
			await invalidateAccountData();
			showToast("Instituição excluída.", "positive");
		},
	});
	const totalBalance =
		accounts.data
			?.filter(account => account.type !== "CREDIT_CARD")
			.reduce((sum, account) => sum + (account.balance ?? 0), 0) ?? 0;
	const organization = useMemo(() => {
		const allAccounts = accounts.data ?? [];
		const institutions = getFinancialInstitutions(allAccounts);
		const groups: Array<{ accounts: FinancialAccount[]; institution: FinancialInstitution | null }> =
			institutions.map(institution => ({
				accounts: allAccounts.filter(account => account.institutionId === institution.id),
				institution,
			}));
		const unassigned = allAccounts.filter(account => !account.institutionId);
		if (unassigned.length) groups.push({ accounts: unassigned, institution: null });
		return { groups, institutions };
	}, [accounts.data]);

	return (
		<PageContainer className="grid gap-8">
			<PageHeader
				actions={
					<CreateFinancialAccountDialog
						institutions={organization.institutions}
						onCreate={async data => {
							await createAccount.mutateAsync(data);
						}}
						pending={createAccount.isPending}
					/>
				}
				description="Organize bancos, dinheiro, investimentos e cartões sem misturar a tabela de autenticação."
				eyebrow="Patrimônio"
				title="Contas financeiras"
			/>
			<section className="grid gap-4 sm:grid-cols-2">
				<div className="rounded-2xl bg-brand-indigo p-5 text-white shadow-card">
					<p className="text-sm text-white/70">Saldo total</p>
					<p className="mt-2 font-bold text-3xl">{currency.format(totalBalance)}</p>
				</div>
				<div className="rounded-2xl border bg-brand-yellow p-5 text-brand-ink shadow-card">
					<p className="text-brand-ink/65 text-sm">Contas cadastradas</p>
					<p className="mt-2 font-bold text-3xl">{accounts.data?.length ?? 0}</p>
				</div>
			</section>
			{accounts.isPending ? (
				<div className="grid gap-6">
					{[1, 2].map(item => (
						<Skeleton className="h-64" key={item} />
					))}
				</div>
			) : accounts.isError ? (
				<EmptyState
					description="Tente novamente em instantes."
					icon={<LuLandmark className="size-6" />}
					title="Não foi possível carregar suas contas"
				/>
			) : accounts.data?.length ? (
				<section className="grid gap-6">
					{organization.groups.map(group => (
						<FinancialInstitutionGroup
							accounts={group.accounts}
							institution={group.institution}
							institutions={organization.institutions}
							key={group.institution?.id ?? "unassigned"}
							onCreate={async data => {
								await createAccount.mutateAsync(data);
							}}
							onDelete={account => deleteAccount.mutateAsync(account.id)}
							onDeleteInstitution={institution => deleteInstitution.mutateAsync(institution.id)}
							onUpdate={(id, data) => updateAccount.mutateAsync({ data, id })}
							onUpdateInstitution={(institution, name) =>
								updateInstitution.mutateAsync({ id: institution.id, name })
							}
							pending={createAccount.isPending}
						/>
					))}
				</section>
			) : (
				<EmptyState
					action={
						<CreateFinancialAccountDialog
							onCreate={async data => {
								await createAccount.mutateAsync(data);
							}}
							pending={createAccount.isPending}
						/>
					}
					description="Comece com sua conta principal ou cadastre um cartão de crédito diretamente."
					icon={<LuWalletCards className="size-7" />}
					title="Nenhuma conta cadastrada"
				/>
			)}
		</PageContainer>
	);
}

export const Route = createFileRoute("/accounts")({ component: AccountsPage });
