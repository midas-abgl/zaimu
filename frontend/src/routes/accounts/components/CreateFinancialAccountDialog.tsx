import { type SyntheticEvent, useState } from "react";
import { LuPlus } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { CustomSelect } from "@/components/ui/CustomSelect";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { MoneyField } from "@/components/ui/MoneyField";
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import type { FinancialAccount, FinancialInstitution } from "@/lib/api";

const types = [
	{ label: "Conta corrente", value: "CHECKING" },
	{ label: "Poupança", value: "SAVINGS" },
	{ label: "Investimentos", value: "INVESTMENT" },
	{ label: "Dinheiro", value: "CASH" },
	{ label: "Cartão de crédito", value: "CREDIT_CARD" },
];
const days = Array.from({ length: 31 }, (_, index) => ({
	label: `Dia ${index + 1}`,
	value: String(index + 1),
}));
const NEW_INSTITUTION = "__new_institution__";
const NO_INSTITUTION = "__no_institution__";

type Draft = Parameters<typeof import("@/lib/dataService").dataService.accounts.create>[0];

export function CreateFinancialAccountDialog({
	contextual = false,
	defaultInstitutionId,
	institutions = [],
	onCreate,
	pending,
}: {
	contextual?: boolean;
	defaultInstitutionId?: string | null;
	institutions?: FinancialInstitution[];
	onCreate: (data: Draft) => Promise<void>;
	pending: boolean;
}) {
	const initialInstitution = () =>
		defaultInstitutionId ?? (defaultInstitutionId === null ? NO_INSTITUTION : undefined);
	const [open, setOpen] = useState(false);
	const [institutionId, setInstitutionId] = useState<string | undefined>(initialInstitution);
	const [newInstitutionName, setNewInstitutionName] = useDebouncedInput("", () => undefined);
	const [name, setName] = useDebouncedInput("", () => undefined);
	const [type, setType] = useState<FinancialAccount["type"]>("CHECKING");
	const [balance, setBalance] = useState("0");
	const [creditLimit, setCreditLimit] = useState("");
	const [securityDeposit, setSecurityDeposit] = useState("");
	const [statementDay, setStatementDay] = useState("10");
	const [dueDay, setDueDay] = useState("17");
	const [workingDueDate, setWorkingDueDate] = useState(false);

	const reset = () => {
		setInstitutionId(initialInstitution());
		setNewInstitutionName("");
		setName("");
		setType("CHECKING");
		setBalance("0");
		setCreditLimit("");
		setSecurityDeposit("");
		setStatementDay("10");
		setDueDay("17");
		setWorkingDueDate(false);
	};
	const handleOpenChange = (nextOpen: boolean) => {
		setOpen(nextOpen);
		if (!nextOpen) reset();
	};
	const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		try {
			const institutionName =
				institutionId === NEW_INSTITUTION
					? newInstitutionName.trim()
					: institutions.find(institution => institution.id === institutionId)?.name;
			await onCreate({
				balance: type === "CREDIT_CARD" ? undefined : Number(balance || 0),
				creditCard:
					type === "CREDIT_CARD"
						? {
								creditLimit: Number(creditLimit),
								dueDay: Number(dueDay),
								securityDeposit: securityDeposit ? Number(securityDeposit) : undefined,
								statementDay: Number(statementDay),
								workingDueDate,
							}
						: undefined,
				institutionName: institutionName || undefined,
				name: name.trim(),
				type,
			});
		} catch {
			return;
		}
		handleOpenChange(false);
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogTrigger asChild>
				<Button
					className={contextual ? "cursor-pointer" : "h-11 cursor-pointer"}
					size={contextual ? "sm" : "default"}
					variant={contextual ? "outline" : "default"}
				>
					<LuPlus /> {contextual ? "Adicionar conta" : "Nova conta"}
				</Button>
			</DialogTrigger>
			<DialogContent className="scrollbar-themed max-h-[92dvh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Cadastrar conta</DialogTitle>
					<DialogDescription>Inclua conta bancária, dinheiro, investimento ou cartão.</DialogDescription>
				</DialogHeader>
				<form className="grid gap-5" onSubmit={handleSubmit}>
					<CustomSelect
						label="Instituição"
						onValueChange={setInstitutionId}
						options={[
							...institutions.map(institution => ({
								label: institution.name,
								value: institution.id,
							})),
							{ label: "Nova instituição", value: NEW_INSTITUTION },
							{ label: "Sem instituição", value: NO_INSTITUTION },
						]}
						placeholder="Selecione uma instituição"
						required
						value={institutionId}
					/>
					{institutionId === NEW_INSTITUTION && (
						<FormField
							autoComplete="organization"
							description="Banco, fintech ou corretora que reúne esta conta."
							id="institution-name"
							label="Nome da instituição"
							name="institution-name"
							onChange={event => setNewInstitutionName(event.currentTarget.value)}
							placeholder="Ex: Mercado Pago"
							required
							type="text"
							value={newInstitutionName}
						/>
					)}
					<FormField
						autoComplete="off"
						id="account-name"
						label="Nome da conta"
						name="account-name"
						onChange={event => setName(event.currentTarget.value)}
						placeholder="Ex: Principal ou Cartão Gold"
						required
						type="text"
						value={name}
					/>
					<CustomSelect
						label="Tipo"
						onValueChange={value => setType(value as FinancialAccount["type"])}
						options={types}
						placeholder="Selecione o tipo"
						required
						value={type}
					/>
					{type !== "CREDIT_CARD" && (
						<MoneyField
							id="balance"
							label="Saldo inicial"
							onValueChange={setBalance}
							placeholder="R$ 2.500,00"
							value={balance}
						/>
					)}
					{type === "CREDIT_CARD" && (
						<div className="grid gap-5 rounded-2xl border bg-muted/35 p-4">
							<MoneyField
								id="credit-limit"
								label="Limite"
								onValueChange={setCreditLimit}
								placeholder="R$ 5.000,00"
								required
								value={creditLimit}
							/>
							<div className="grid gap-2">
								<MoneyField
									id="security-deposit"
									label="Valor em garantia (opcional)"
									onValueChange={setSecurityDeposit}
									placeholder="R$ 500,00"
									value={securityDeposit}
								/>
								<p className="text-muted-foreground text-xs">
									Use somente em cartões cujo limite depende de dinheiro deixado em garantia. Não entra no
									saldo disponível.
								</p>
							</div>
							<div className="grid gap-4 sm:grid-cols-2">
								<CustomSelect
									label="Fechamento"
									onValueChange={setStatementDay}
									options={days}
									placeholder="Dia da fatura"
									required
									value={statementDay}
								/>
								<CustomSelect
									label="Vencimento"
									onValueChange={setDueDay}
									options={days}
									placeholder="Dia do vencimento"
									required
									value={dueDay}
								/>
							</div>
							<label className="flex cursor-pointer items-start gap-3 text-sm" htmlFor="working-due-date">
								<Checkbox
									checked={workingDueDate}
									className="mt-0.5 cursor-pointer"
									id="working-due-date"
									onCheckedChange={checked => setWorkingDueDate(checked === true)}
								/>
								<span>
									<strong className="block">Ajustar para dia útil</strong>
									<span className="text-muted-foreground">Move vencimentos que caem em fim de semana.</span>
								</span>
							</label>
						</div>
					)}
					<DialogFooter>
						<Button
							className="cursor-pointer"
							onClick={() => handleOpenChange(false)}
							type="button"
							variant="outline"
						>
							Descartar
						</Button>
						<Button
							className="cursor-pointer disabled:cursor-not-allowed"
							disabled={
								pending ||
								!institutionId ||
								!name.trim() ||
								(institutionId === NEW_INSTITUTION && !newInstitutionName.trim()) ||
								(type === "CREDIT_CARD" && !creditLimit)
							}
							type="submit"
						>
							{pending ? "Salvando…" : "Salvar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
