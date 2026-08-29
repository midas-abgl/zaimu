import { type SyntheticEvent, useState } from "react";
import { LuPencil, LuPlus } from "react-icons/lu";
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
type UpdateDraft = import("@/lib/dataService").FinancialAccountUpdateDraft;

export function CreateFinancialAccountDialog({
	contextual = false,
	account,
	defaultType,
	defaultInstitutionId,
	institutions = [],
	onCreate,
	onOpenChange,
	onUpdate,
	open: controlledOpen,
	pending,
	showTrigger = true,
	iconOnly = false,
}: {
	account?: FinancialAccount;
	contextual?: boolean;
	defaultType?: FinancialAccount["type"];
	defaultInstitutionId?: string | null;
	institutions?: FinancialInstitution[];
	onCreate: (data: Draft) => Promise<unknown>;
	onOpenChange?: (open: boolean) => void;
	onUpdate?: (id: string, data: UpdateDraft) => Promise<unknown>;
	open?: boolean;
	pending: boolean;
	showTrigger?: boolean;
	iconOnly?: boolean;
}) {
	const initialInstitution = () =>
		account?.institutionId ??
		defaultInstitutionId ??
		(defaultInstitutionId === null ? NO_INSTITUTION : undefined);
	const [internalOpen, setInternalOpen] = useState(false);
	const open = controlledOpen ?? internalOpen;
	const [institutionId, setInstitutionId] = useState<string | undefined>(initialInstitution);
	const [newInstitutionName, setNewInstitutionName] = useDebouncedInput("", () => undefined);
	const [name, setName] = useDebouncedInput(account?.name ?? "", () => undefined);
	const [type, setType] = useState<FinancialAccount["type"]>(account?.type ?? defaultType ?? "CHECKING");
	const [balance, setBalance] = useState(String(account?.balance ?? 0));
	const [creditLimit, setCreditLimit] = useState(String(account?.creditCard?.creditLimit ?? ""));
	const [securityDeposit, setSecurityDeposit] = useState(String(account?.creditCard?.securityDeposit ?? ""));
	const [statementDay, setStatementDay] = useState(String(account?.creditCard?.statementDay ?? 10));
	const [dueDay, setDueDay] = useState(String(account?.creditCard?.dueDay ?? 17));
	const [workingDueDate, setWorkingDueDate] = useState(account?.creditCard?.workingDueDate ?? false);
	const hasInvalidBillingDays = Number(statementDay) >= Number(dueDay);

	const reset = () => {
		setInstitutionId(initialInstitution());
		setNewInstitutionName("");
		setName(account?.name ?? "");
		setType(account?.type ?? defaultType ?? "CHECKING");
		setBalance(String(account?.balance ?? 0));
		setCreditLimit(String(account?.creditCard?.creditLimit ?? ""));
		setSecurityDeposit(String(account?.creditCard?.securityDeposit ?? ""));
		setStatementDay(String(account?.creditCard?.statementDay ?? 10));
		setDueDay(String(account?.creditCard?.dueDay ?? 17));
		setWorkingDueDate(account?.creditCard?.workingDueDate ?? false);
	};
	const handleOpenChange = (nextOpen: boolean) => {
		setInternalOpen(nextOpen);
		onOpenChange?.(nextOpen);
		if (!nextOpen) reset();
	};
	const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (type === "CREDIT_CARD" && hasInvalidBillingDays) return;
		try {
			const institutionName =
				institutionId === NEW_INSTITUTION
					? newInstitutionName.trim()
					: institutions.find(institution => institution.id === institutionId)?.name;
			const data = {
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
				institutionName: institutionId === NO_INSTITUTION ? "" : institutionName || undefined,
				name: name.trim() || null,
				type,
			};
			if (account && onUpdate) {
				const { type: _, ...updateData } = data;
				await onUpdate(account.id, updateData);
			} else await onCreate(data as Draft);
		} catch {
			return;
		}
		handleOpenChange(false);
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			{showTrigger && (
				<DialogTrigger asChild>
					<Button
						aria-label={account ? `Editar ${account.name ?? "conta"}` : undefined}
						className={contextual ? "cursor-pointer" : "h-11 cursor-pointer"}
						size={iconOnly ? "icon-sm" : contextual ? "sm" : "default"}
						title={iconOnly && account ? `Editar ${account.name ?? "conta"}` : undefined}
						variant={contextual ? "outline" : "default"}
					>
						{account ? <LuPencil /> : <LuPlus />}
						{!iconOnly && ` ${account ? "Editar" : contextual ? "Adicionar conta" : "Nova conta"}`}
					</Button>
				</DialogTrigger>
			)}
			<DialogContent className="scrollbar-themed max-h-[92dvh] overflow-y-auto sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{account ? "Editar conta" : "Cadastrar conta"}</DialogTitle>
					<DialogDescription>
						{account
							? "Atualize os dados desta conta."
							: "Inclua conta bancária, dinheiro, investimento ou cartão."}
					</DialogDescription>
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
						label="Nome da conta (opcional)"
						name="account-name"
						onChange={event => setName(event.currentTarget.value)}
						placeholder="Ex: Principal ou Cartão Gold"
						type="text"
						value={name}
					/>
					{account ? (
						<div className="grid gap-2">
							<p className="font-medium text-sm">Tipo</p>
							<p className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
								{types.find(item => item.value === type)?.label}
							</p>
						</div>
					) : (
						<CustomSelect
							label="Tipo"
							onValueChange={value => setType(value as FinancialAccount["type"])}
							options={types}
							placeholder="Selecione o tipo"
							required
							value={type}
						/>
					)}
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
							{hasInvalidBillingDays && (
								<p className="text-destructive text-sm">
									O vencimento deve ser posterior ao fechamento da fatura.
								</p>
							)}
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
								(institutionId === NEW_INSTITUTION && !newInstitutionName.trim()) ||
								(type === "CREDIT_CARD" && !creditLimit) ||
								(type === "CREDIT_CARD" && hasInvalidBillingDays)
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
