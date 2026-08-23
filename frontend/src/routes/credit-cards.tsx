import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { LuCreditCard, LuPlus } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import type { CreditCard } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import { showToast, useAuthStore } from "@/stores";
import { CreatePurchaseDialog, CreditCardOverviewCard } from "./credit-cards/components";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

function CreditCardsPage() {
	const queryClient = useQueryClient();
	const hasAccess = useAuthStore(state => state.isAuthenticated || state.isGuestMode);
	const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
	const cards = useQuery({
		enabled: hasAccess,
		queryFn: () => dataService.creditCards.getAll(),
		queryKey: ["credit-cards"],
	});
	const categories = useQuery({
		enabled: hasAccess,
		queryFn: () => dataService.categories.getAll(),
		queryKey: ["categories"],
	});
	const purchase = useMutation({
		mutationFn: ({
			cardId,
			data,
		}: {
			cardId: string;
			data: Parameters<typeof dataService.creditCards.addPurchase>[1];
		}) => dataService.creditCards.addPurchase(cardId, data),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["credit-card-statements"] });
			showToast("Compra registrada e faturas recalculadas.", "positive");
		},
	});
	const totalLimit = cards.data?.reduce((sum, card) => sum + card.creditLimit, 0) ?? 0;

	return (
		<div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:py-10">
			<PageHeader
				actions={
					<Button asChild className="h-11">
						<Link to="/accounts">
							<LuPlus /> Novo cartão
						</Link>
					</Button>
				}
				description="Acompanhe limite, previsão de fatura e parcelamentos."
				eyebrow="Crédito"
				title="Cartões e compras"
			/>
			<section className="grid gap-4 sm:grid-cols-2">
				<div className="rounded-2xl bg-brand-yellow p-5 text-brand-ink shadow-card">
					<p className="text-brand-ink/60 text-sm">Limite total</p>
					<p className="mt-2 font-bold text-3xl">{currency.format(totalLimit)}</p>
				</div>
				<div className="rounded-2xl border bg-card p-5 shadow-card">
					<p className="text-muted-foreground text-sm">Cartões cadastrados</p>
					<p className="mt-2 font-bold text-3xl">{cards.data?.length ?? 0}</p>
				</div>
			</section>
			{cards.isPending ? (
				<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					{[1, 2, 3].map(item => (
						<Skeleton className="h-72" key={item} />
					))}
				</div>
			) : cards.isError ? (
				<EmptyState
					description="Tente novamente em instantes."
					icon={<LuCreditCard className="size-7" />}
					title="Não foi possível carregar cartões"
				/>
			) : cards.data?.length ? (
				<section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
					{cards.data.map(card => (
						<CreditCardOverviewCard card={card} key={card.id} onAddPurchase={() => setSelectedCard(card)} />
					))}
				</section>
			) : (
				<EmptyState
					action={
						<Button asChild>
							<Link to="/accounts">
								<LuPlus /> Cadastrar cartão
							</Link>
						</Button>
					}
					description="Cadastre um cartão direto na tela de contas financeiras."
					icon={<LuCreditCard className="size-7" />}
					title="Nenhum cartão cadastrado"
				/>
			)}
			<CreatePurchaseDialog
				card={selectedCard}
				categories={categories.data ?? []}
				onOpenChange={open => !open && setSelectedCard(null)}
				onSubmit={async data => {
					if (!selectedCard) return;
					await purchase.mutateAsync({
						cardId: selectedCard.id,
						data: { ...data, categoryId: data.categoryId === "none" ? undefined : data.categoryId },
					});
				}}
				open={Boolean(selectedCard)}
				pending={purchase.isPending}
			/>
		</div>
	);
}

export const Route = createFileRoute("/credit-cards")({ component: CreditCardsPage });
