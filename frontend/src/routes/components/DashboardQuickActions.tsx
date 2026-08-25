import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { LuCreditCard, LuPlus, LuReceiptText } from "react-icons/lu";
import { CreateTransactionDialog } from "@/components/transactions";
import { Button } from "@/components/ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import type { CreditCard } from "@/lib/api";
import { dataService } from "@/lib/dataService";
import { showToast } from "@/stores";
import { CreatePurchaseDialog } from "../credit-cards/components";

export function DashboardQuickActions() {
	const queryClient = useQueryClient();
	const [menuOpen, setMenuOpen] = useState(false);
	const [transactionOpen, setTransactionOpen] = useState(false);
	const [selectedCard, setSelectedCard] = useState<CreditCard | null>(null);
	const cards = useQuery({ queryFn: () => dataService.creditCards.getAll(), queryKey: ["credit-cards"] });
	const purchase = useMutation({
		mutationFn: ({
			cardId,
			data,
		}: {
			cardId: string;
			data: Parameters<typeof dataService.creditCards.addPurchase>[1];
		}) => dataService.creditCards.addPurchase(cardId, data),
		onError: error => showToast(error.message, "negative"),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["credit-card-statements"] }),
				queryClient.invalidateQueries({ queryKey: ["transactions"] }),
				queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
			]);
			showToast("Compra registrada e faturas recalculadas.", "positive");
		},
	});

	return (
		<>
			<Popover onOpenChange={setMenuOpen} open={menuOpen}>
				<PopoverTrigger asChild>
					<Button className="cursor-pointer">
						<LuPlus /> Adicionar
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-72 gap-2">
					<Button
						className="w-full cursor-pointer justify-start"
						onClick={() => {
							setMenuOpen(false);
							setTransactionOpen(true);
						}}
						variant="outline"
					>
						<LuReceiptText /> Nova transação
					</Button>
					<p className="px-1 pt-2 font-medium text-muted-foreground text-xs">Compra no cartão</p>
					{cards.isPending ? (
						<p className="px-1 text-muted-foreground text-sm">Carregando cartões…</p>
					) : cards.data?.length ? (
						cards.data.map(card => (
							<Button
								className="w-full cursor-pointer justify-start"
								key={card.id}
								onClick={() => {
									setMenuOpen(false);
									setSelectedCard(card);
								}}
								variant="outline"
							>
								<LuCreditCard /> {card.accountName}
							</Button>
						))
					) : (
						<p className="px-1 text-muted-foreground text-sm">Nenhum cartão cadastrado.</p>
					)}
				</PopoverContent>
			</Popover>
			<CreateTransactionDialog onOpenChange={setTransactionOpen} open={transactionOpen} />
			<CreatePurchaseDialog
				card={selectedCard}
				onOpenChange={open => !open && setSelectedCard(null)}
				onSubmit={async data => {
					if (selectedCard) await purchase.mutateAsync({ cardId: selectedCard.id, data });
				}}
				open={Boolean(selectedCard)}
				pending={purchase.isPending}
			/>
		</>
	);
}
