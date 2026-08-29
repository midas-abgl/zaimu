const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

export function InstallmentPurchaseDetails({
	installmentAmount,
	installments,
	totalAmount,
}: {
	installmentAmount: number;
	installments: number;
	totalAmount: number;
}) {
	return (
		<span className="whitespace-nowrap font-semibold text-foreground text-sm">
			{installments > 1
				? `${installments}x de ${currency.format(installmentAmount)}`
				: `À vista · ${currency.format(totalAmount)}`}
		</span>
	);
}
