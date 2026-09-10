import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LuFileUp } from "react-icons/lu";
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
import { dataService } from "@/lib/dataService";
import {
	compareFinancialAccountsByOptionLabel,
	getFinancialAccountOptionLabel,
} from "@/lib/financial-account";
import { showToast } from "@/stores";
import { StatementFilePicker } from "./StatementFilePicker";

const providerOptions = [
	{ label: "Mercado Pago", value: "MERCADO_PAGO" },
	{ disabled: true, label: "Genérico · Em breve", value: "GENERIC" },
] as const;
type TransactionImportProvider = (typeof providerOptions)[number]["value"];

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
	const [provider, setProvider] = useState<TransactionImportProvider | "">("");
	const accounts = useQuery({ enabled: open, queryFn: dataService.accounts.getAll, queryKey: ["accounts"] });
	useEffect(() => {
		if (!open) return;
		setFile(null);
		setFinancialAccountId(defaultFinancialAccountId ?? "");
		setProvider("");
	}, [defaultFinancialAccountId, open]);
	const handleOpenChange = (nextOpen: boolean) => {
		if (!nextOpen) {
			setFile(null);
			setProvider("");
		}
		onOpenChange(nextOpen);
	};
	const createImport = useMutation({
		mutationFn: () => {
			if (!file) throw new Error("Selecione um PDF do Mercado Pago.");
			if (!financialAccountId) throw new Error("Selecione a conta que receberá as transações.");
			if (provider !== "MERCADO_PAGO") throw new Error("Selecione a instituição do extrato.");
			return dataService.transactionImports.create({ file, financialAccountId, provider });
		},
		onError: error => showToast(error.message, "negative"),
		onSuccess: result => {
			setFile(null);
			setProvider("");
			handleOpenChange(false);
			if (!result.transactionImport) {
				showToast("Nenhuma transação nova encontrada no extrato.", "info");
				return;
			}
			onImported(result.transactionImport.id);
			showToast(
				result.ignoredCount
					? `${result.ignoredCount} ${result.ignoredCount === 1 ? "transação já importada foi ignorada" : "transações já importadas foram ignoradas"}.`
					: "Extrato importado para revisão.",
				"positive",
			);
		},
	});
	const selectableAccounts =
		accounts.data
			?.filter(account => account.type !== "CREDIT_CARD" && account.type !== "REWARDS")
			.toSorted(compareFinancialAccountsByOptionLabel) ?? [];

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Importar transações</DialogTitle>
					<DialogDescription>Selecione manualmente a conta e envie seu extrato.</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4">
					<CustomSelect
						label="Instituição"
						onValueChange={value => setProvider(value as TransactionImportProvider)}
						options={providerOptions.map(option => ({ ...option }))}
						placeholder="Selecione a instituição"
						required
						sortOptions={false}
						value={provider}
					/>
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
					<StatementFilePicker file={file} onFileChange={setFile} />
				</div>
				<DialogFooter>
					<Button className="cursor-pointer" onClick={() => handleOpenChange(false)} variant="outline">
						Descartar
					</Button>
					<Button
						className="cursor-pointer disabled:cursor-not-allowed"
						disabled={!file || !financialAccountId || provider !== "MERCADO_PAGO" || createImport.isPending}
						onClick={() => createImport.mutate()}
					>
						<LuFileUp /> {createImport.isPending ? "Importando…" : "Importar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
