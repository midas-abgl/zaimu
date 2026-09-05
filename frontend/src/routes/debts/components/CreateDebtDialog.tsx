import { type SyntheticEvent, useEffect, useState } from "react";
import { DebtPersonPicker } from "@/components/debts";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { DateField } from "@/components/ui/DateField";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/Dialog";
import { FormField } from "@/components/ui/FormField";
import { MoneyField } from "@/components/ui/MoneyField";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { useDebouncedInput } from "@/hooks/use-debounced-input";

export interface DebtOriginDraft {
	amount: number;
	date?: null | string;
	description?: string;
	dueDate?: string;
	isOwedToMe: boolean;
	personId: string;
}

export function CreateDebtDialog({
	initialValue,
	onOpenChange,
	onSubmit,
	open,
	pending,
}: {
	initialValue?: DebtOriginDraft;
	onOpenChange: (open: boolean) => void;
	onSubmit: (draft: DebtOriginDraft) => Promise<void>;
	open: boolean;
	pending: boolean;
}) {
	const [amount, setAmount] = useState("");
	const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
	const [sendWithoutDate, setSendWithoutDate] = useState(false);
	const [dueDate, setDueDate] = useState("");
	const [description, setDescription] = useDebouncedInput("", () => undefined);
	const [personId, setPersonId] = useState("");
	const [isOwedToMe, setIsOwedToMe] = useState(true);
	useEffect(() => {
		if (!open || !initialValue) return;
		setAmount(String(initialValue.amount));
		setDate(initialValue.date?.slice(0, 10) ?? "");
		setSendWithoutDate(!initialValue.date);
		setDueDate(initialValue.dueDate?.slice(0, 10) ?? "");
		setDescription(initialValue.description ?? "");
		setPersonId(initialValue.personId);
		setIsOwedToMe(initialValue.isOwedToMe);
	}, [initialValue, open, setDescription]);
	const reset = () => {
		setAmount("");
		setDate(new Date().toISOString().slice(0, 10));
		setSendWithoutDate(false);
		setDueDate("");
		setDescription("");
		setPersonId("");
		setIsOwedToMe(true);
	};
	const handleOpenChange = (nextOpen: boolean) => {
		onOpenChange(nextOpen);
		if (!nextOpen) reset();
	};
	const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();
		await onSubmit({
			amount: Number(amount),
			date: sendWithoutDate ? null : date || undefined,
			description: description.trim() || "Lançamento manual",
			dueDate: dueDate || undefined,
			isOwedToMe,
			personId,
		});
		handleOpenChange(false);
	};

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogContent className="max-h-[92dvh] overflow-hidden p-0 sm:max-w-lg">
				<ScrollArea className="max-h-[92dvh]">
					<form className="grid gap-5 p-6" onSubmit={submit}>
						<DialogHeader>
							<DialogTitle>{initialValue ? "Editar lançamento" : "Novo lançamento"}</DialogTitle>
							<DialogDescription>
								{initialValue
									? "A alteração recalcula o saldo dos dois participantes."
									: isOwedToMe
										? "Este valor aumenta o total que a pessoa deve a você."
										: "Este valor aumenta o total que você deve à pessoa."}
							</DialogDescription>
						</DialogHeader>
						<div className="grid grid-cols-2 gap-2">
							<Button
								className="cursor-pointer"
								onClick={() => setIsOwedToMe(true)}
								type="button"
								variant={isOwedToMe ? "default" : "outline"}
							>
								Recebimentos
							</Button>
							<Button
								className="cursor-pointer"
								onClick={() => setIsOwedToMe(false)}
								type="button"
								variant={!isOwedToMe ? "destructive" : "outline"}
							>
								Pagamentos
							</Button>
						</div>
						<DebtPersonPicker onValueChange={setPersonId} required value={personId} />
						<MoneyField
							id="debt-origin-amount"
							label="Valor"
							onValueChange={setAmount}
							required
							value={amount}
						/>
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="grid content-start gap-4">
								<DateField
									autoComplete="off"
									disabled={sendWithoutDate}
									id="debt-origin-date"
									label="Data"
									name="debt-origin-date"
									onChange={event => setDate(event.currentTarget.value)}
									value={sendWithoutDate ? "" : date}
								/>
								<label className="flex cursor-pointer items-start gap-3 text-sm" htmlFor="debt-without-date">
									<Checkbox
										checked={sendWithoutDate}
										className="mt-0.5 cursor-pointer"
										id="debt-without-date"
										onCheckedChange={checked => setSendWithoutDate(checked === true)}
									/>
									<span className="font-medium text-foreground-muted">Não incluir data</span>
								</label>
							</div>
							<DateField
								autoComplete="off"
								id="debt-origin-due-date"
								label="Vencimento"
								name="debt-origin-due-date"
								onChange={event => setDueDate(event.currentTarget.value)}
								value={dueDate}
							/>
						</div>
						<FormField
							autoComplete="off"
							id="debt-origin-description"
							label="Motivo"
							name="debt-origin-description"
							onChange={event => setDescription(event.currentTarget.value)}
							placeholder="Ex: Divisão do aluguel"
							type="text"
							value={description}
						/>
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
								className="cursor-pointer"
								disabled={pending || !personId || Number(amount) <= 0}
								type="submit"
							>
								{pending ? "Salvando…" : initialValue ? "Salvar alterações" : "Salvar lançamento"}
							</Button>
						</DialogFooter>
					</form>
				</ScrollArea>
			</DialogContent>
		</Dialog>
	);
}
