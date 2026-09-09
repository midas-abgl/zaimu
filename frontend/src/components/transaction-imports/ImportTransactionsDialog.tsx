import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LuFileUp, LuLandmark } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { CustomSelect } from "@/components/ui/CustomSelect";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { dataService } from "@/lib/dataService";
import {
	compareFinancialAccountsByOptionLabel,
	getFinancialAccountOptionLabel,
} from "@/lib/financial-account";
import { showToast } from "@/stores";

export function ImportTransactionsDialog({
	defaultFinancialAccountId,
	onImported,
	onOpenChange,
	open,
}: {
	defaultFinancialAccountId?: string;
	onImported: (importId: string) => void;
	onOpenChange: (open: boolean) => void;
	open: boolean;
}) {
	const [file, setFile] = useState<File | null>(null);
	const [financialAccountId, setFinancialAccountId] = useState(defaultFinancialAccountId ?? "");
	const accounts = useQuery({ enabled: open, queryFn: dataService.accounts.getAll, queryKey: ["accounts"] });
	useEffect(() => {
		if (open) setFinancialAccountId(defaultFinancialAccountId ?? "");
	}, [defaultFinancialAccountId, open]);
	const createImport = useMutation({
		mutationFn: () => {
			if (!file) throw new Error("Selecione um PDF do Mercado Pago.");
			if (!financialAccountId) throw new Error("Selecione a conta que receberá as transações.");
			return dataService.transactionImports.create({ file, financialAccountId });
		},
		onError: error => showToast(error.message, "negative"),
		onSuccess: transactionImport => {
			setFile(null);
			onOpenChange(false);
			onImported(transactionImport.id);
			showToast("Extrato importado para revisão.", "positive");
		},
	});
	const selectableAccounts =
		accounts.data
			?.filter(account => account.type !== "CREDIT_CARD" && account.type !== "REWARDS")
			.toSorted(compareFinancialAccountsByOptionLabel) ?? [];

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Importar transações</DialogTitle>
					<DialogDescription>Selecione manualmente a conta e envie seu extrato.</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4">
					<div className="grid gap-2 rounded-2xl border p-3">
						<p className="font-medium">Provider</p>
						<Button className="cursor-default justify-start" disabled variant="outline">
							<LuLandmark /> Mercado Pago
						</Button>
						<Button className="justify-start" disabled variant="outline">
							<LuLandmark /> Genérico · Em breve
						</Button>
					</div>
					<CustomSelect
						label="Conta que receberá as transações"
						onValueChange={setFinancialAccountId}
						options={selectableAccounts.map(account => ({
							label: getFinancialAccountOptionLabel(account),
							value: account.id,
						}))}
						placeholder="Selecione manualmente a conta"
						required
						value={financialAccountId}
					/>
					<FormField
						accept="application/pdf,.pdf"
						id="transaction-import-file"
						label="Extrato Mercado Pago"
						name="statement"
						onChange={event => setFile(event.currentTarget.files?.[0] ?? null)}
						placeholder="Extrato em PDF"
						required
						type="file"
					/>
				</div>
				<DialogFooter>
					<Button className="cursor-pointer" onClick={() => onOpenChange(false)} variant="outline">
						Descartar
					</Button>
					<Button
						className="cursor-pointer disabled:cursor-not-allowed"
						disabled={!file || !financialAccountId || createImport.isPending}
						onClick={() => createImport.mutate()}
					>
						<LuFileUp /> {createImport.isPending ? "Importando…" : "Importar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
