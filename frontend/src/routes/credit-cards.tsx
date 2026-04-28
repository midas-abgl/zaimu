import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { HiCheck, HiCreditCard, HiExclamationCircle, HiPlus, HiShoppingCart, HiXMark } from "react-icons/hi2";
import { api, type CreditCard } from "@/lib/api";
import { type AuthState, useAuthStore } from "@/stores";

function formatCurrency(value: number) {
	return new Intl.NumberFormat("pt-BR", {
		currency: "BRL",
		style: "currency",
	}).format(value);
}

function CreditCardItem({ card, onAddPurchase }: { card: CreditCard; onAddPurchase: () => void }) {
	const { data: statements } = useQuery({
		queryFn: () => api.getCreditCardStatements(card.id, false),
		queryKey: ["credit-card-statements", card.id],
	});

	const pendingStatement = statements?.[0];
	const usedCredit = pendingStatement?.totalAmount || 0;
	const availableCredit = card.creditLimit - usedCredit;
	const usagePercent = (usedCredit / card.creditLimit) * 100;

	const getUsageColor = () => {
		if (usagePercent > 80) return "from-danger-500 to-danger-400";
		if (usagePercent > 50) return "from-accent-500 to-accent-400";
		return "from-success-500 to-success-400";
	};

	return (
		<div className="card space-y-4 p-4">
			{/* Card Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-100">
						<HiCreditCard className="h-6 w-6 text-primary-600" />
					</div>
					<div>
						<p className="font-semibold text-foreground">{card.accountName || "Credit Card"}</p>
						<p className="text-foreground-muted text-xs">
							Closes day {card.statementDay} • Due day {card.dueDay}
						</p>
					</div>
				</div>
				<button
					className="rounded-xl bg-accent-100 p-2.5 text-accent-600 transition-colors hover:bg-accent-200"
					onClick={onAddPurchase}
				>
					<HiShoppingCart className="h-5 w-5" />
				</button>
			</div>

			{/* Usage Bar */}
			<div>
				<div className="mb-2 flex justify-between text-sm">
					<span className="text-foreground-muted">{formatCurrency(usedCredit)} used</span>
					<span className="font-medium text-success-600">{formatCurrency(availableCredit)} available</span>
				</div>
				<div className="h-2.5 overflow-hidden rounded-full bg-primary-100">
					<div
						className={`h-full rounded-full bg-gradient-to-r transition-all duration-500 ${getUsageColor()}`}
						style={{ width: `${Math.min(usagePercent, 100)}%` }}
					/>
				</div>
			</div>

			{/* Pending Statement Warning */}
			{pendingStatement && !pendingStatement.isPaid && (
				<div className="flex items-center gap-3 rounded-xl border border-accent-200 bg-accent-50 p-3">
					<HiExclamationCircle className="h-5 w-5 flex-shrink-0 text-accent-500" />
					<div className="min-w-0 flex-1">
						<p className="font-medium text-foreground text-sm">
							Statement due {new Date(pendingStatement.dueDate).toLocaleDateString("pt-BR")}
						</p>
					</div>
					<span className="rounded-lg bg-accent-500 px-3 py-1 font-bold text-sm text-white">
						{formatCurrency(pendingStatement.totalAmount)}
					</span>
				</div>
			)}

			{/* Limit */}
			<div className="flex justify-between border-primary-50 border-t pt-3">
				<span className="text-foreground-muted text-sm">Credit Limit</span>
				<span className="font-bold text-foreground">{formatCurrency(card.creditLimit)}</span>
			</div>
		</div>
	);
}

function CreditCardsPage() {
	const queryClient = useQueryClient();
	const navigate = useNavigate();
	const user = useAuthStore((s: AuthState) => s.user);
	const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
	const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
	const [newPurchase, setNewPurchase] = useState({
		description: "",
		installments: "1",
		purchaseDate: new Date().toISOString().split("T")[0],
		totalAmount: "",
	});

	const { data: creditCards, isLoading } = useQuery({
		enabled: !!user?.id,
		queryFn: () => api.getCreditCards(user?.id),
		queryKey: ["credit-cards", user?.id],
	});

	const addPurchaseMutation = useMutation({
		mutationFn: ({ cardId, data }: { cardId: string; data: Parameters<typeof api.addCreditPurchase>[1] }) =>
			api.addCreditPurchase(cardId, data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["credit-cards"] });
			queryClient.invalidateQueries({ queryKey: ["credit-card-statements"] });
			setIsPurchaseModalOpen(false);
			resetPurchaseForm();
		},
	});

	const resetPurchaseForm = () => {
		setNewPurchase({
			description: "",
			installments: "1",
			purchaseDate: new Date().toISOString().split("T")[0],
			totalAmount: "",
		});
		setSelectedCard(null);
	};

	const handleAddPurchase = () => {
		if (!selectedCard) return;

		addPurchaseMutation.mutate({
			cardId: selectedCard.id,
			data: {
				description: newPurchase.description,
				installments: Number.parseInt(newPurchase.installments, 10) || 1,
				purchaseDate: newPurchase.purchaseDate,
				totalAmount: Number.parseFloat(newPurchase.totalAmount),
			},
		});
	};

	const totalLimit = creditCards?.reduce((sum, c) => sum + c.creditLimit, 0) || 0;

	if (isLoading) {
		return (
			<div className="min-h-screen bg-background">
				<div className="gradient-primary px-4 pt-12 pb-20">
					<div className="mb-4 h-8 w-32 animate-pulse rounded-lg bg-white/20" />
					<div className="h-10 w-48 animate-pulse rounded-lg bg-white/20" />
				</div>
				<div className="-mt-12 space-y-3 px-4">
					{[1, 2].map(i => (
						<div className="h-48 animate-pulse rounded-2xl bg-background-card" key={i} />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<div className="gradient-primary relative overflow-hidden px-4 pt-12 pb-24">
				<div className="absolute top-0 right-0 h-48 w-48 translate-x-1/4 -translate-y-1/2 rounded-full bg-primary-500/20" />
				<div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-1/4 translate-y-1/2 rounded-full bg-primary-500/10" />

				<div className="relative z-10">
					<div className="mb-6 flex items-center justify-between">
						<h1 className="font-bold text-2xl text-white">Credit Cards</h1>
						<button
							className="flex items-center gap-2 rounded-xl bg-accent-300 px-4 py-2 font-semibold text-primary-900 transition-all hover:bg-accent-200 active:scale-95"
							onClick={() => navigate({ to: "/accounts" })}
						>
							<HiPlus className="h-5 w-5" />
							<span>Add Card</span>
						</button>
					</div>

					{creditCards && creditCards.length > 0 && (
						<div>
							<p className="mb-1 text-sm text-white/70">Total Credit Limit</p>
							<p className="font-bold text-4xl text-white tracking-tight">{formatCurrency(totalLimit)}</p>
							<p className="mt-2 text-sm text-white/70">
								{creditCards.length} card{creditCards.length !== 1 ? "s" : ""}
							</p>
						</div>
					)}
				</div>
			</div>

			{/* Credit Card List */}
			<div className="-mt-12 space-y-4 px-4 pb-8">
				{creditCards?.map((card, idx) => (
					<div className="animate-fade-in" key={card.id} style={{ animationDelay: `${idx * 0.1}s` }}>
						<CreditCardItem
							card={card}
							onAddPurchase={() => {
								setSelectedCard(card);
								setIsPurchaseModalOpen(true);
							}}
						/>
					</div>
				))}

				{(!creditCards || creditCards.length === 0) && (
					<div className="card animate-fade-in py-12 text-center">
						<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
							<HiCreditCard className="h-8 w-8 text-primary-300" />
						</div>
						<p className="mb-1 font-semibold text-foreground">No credit cards yet</p>
						<p className="mb-4 text-foreground-muted text-sm">Add one from the Accounts page</p>
						<button
							className="btn-primary inline-flex items-center gap-2"
							onClick={() => navigate({ to: "/accounts" })}
						>
							<HiPlus className="h-5 w-5" />
							<span>Go to Accounts</span>
						</button>
					</div>
				)}
			</div>

			{/* Add Purchase Modal */}
			{isPurchaseModalOpen && (
				<div className="fixed inset-0 z-50 flex items-end justify-center">
					<div
						className="absolute inset-0 animate-fade-in bg-primary-900/50 backdrop-blur-sm"
						onClick={() => {
							setIsPurchaseModalOpen(false);
							resetPurchaseForm();
						}}
					/>

					<div className="relative max-h-[90vh] w-full max-w-lg animate-slide-up overflow-y-auto rounded-t-3xl bg-white p-6">
						<div className="absolute top-3 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-primary-200" />

						<div className="mb-6 flex items-center justify-between pt-2">
							<div>
								<h2 className="font-bold text-foreground text-xl">New Purchase</h2>
								<p className="text-foreground-muted text-sm">{selectedCard?.accountName || "Card"}</p>
							</div>
							<button
								className="rounded-full p-2 transition-colors hover:bg-primary-50"
								onClick={() => {
									setIsPurchaseModalOpen(false);
									resetPurchaseForm();
								}}
							>
								<HiXMark className="h-6 w-6 text-foreground-muted" />
							</button>
						</div>

						{/* Description */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Description</span>
							<input
								className="input"
								onChange={e => setNewPurchase({ ...newPurchase, description: e.target.value })}
								placeholder="What did you buy?"
								type="text"
								value={newPurchase.description}
							/>
						</div>

						{/* Amount */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Total Amount</span>
							<div className="relative">
								<span className="absolute top-1/2 left-4 -translate-y-1/2 font-medium text-foreground-muted">
									R$
								</span>
								<input
									className="input pl-12 font-bold text-xl"
									onChange={e => setNewPurchase({ ...newPurchase, totalAmount: e.target.value })}
									placeholder="0.00"
									step="0.01"
									type="number"
									value={newPurchase.totalAmount}
								/>
							</div>
						</div>

						{/* Installments */}
						<div className="mb-4">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Installments</span>
							<input
								className="input"
								max="48"
								min="1"
								onChange={e => setNewPurchase({ ...newPurchase, installments: e.target.value })}
								type="number"
								value={newPurchase.installments}
							/>
							{Number.parseInt(newPurchase.installments, 10) > 1 && newPurchase.totalAmount && (
								<p className="mt-2 text-foreground-muted text-sm">
									{newPurchase.installments}x of{" "}
									<span className="font-semibold text-primary-600">
										{formatCurrency(
											Number.parseFloat(newPurchase.totalAmount) /
												Number.parseInt(newPurchase.installments, 10),
										)}
									</span>
								</p>
							)}
						</div>

						{/* Purchase Date */}
						<div className="mb-6">
							<span className="mb-2 block font-medium text-foreground-muted text-sm">Purchase Date</span>
							<input
								className="input"
								onChange={e => setNewPurchase({ ...newPurchase, purchaseDate: e.target.value })}
								type="date"
								value={newPurchase.purchaseDate}
							/>
						</div>

						{/* Actions */}
						<div className="flex gap-3">
							<button
								className="btn-secondary flex-1"
								onClick={() => {
									setIsPurchaseModalOpen(false);
									resetPurchaseForm();
								}}
							>
								Cancel
							</button>
							<button
								className="btn-primary flex flex-1 items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
								disabled={
									!newPurchase.description || !newPurchase.totalAmount || addPurchaseMutation.isPending
								}
								onClick={handleAddPurchase}
							>
								{addPurchaseMutation.isPending ? (
									<span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
								) : (
									<>
										<HiCheck className="h-5 w-5" />
										<span>Add</span>
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export const Route = createFileRoute("/credit-cards")({
	component: CreditCardsPage,
});
