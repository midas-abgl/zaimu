import { useEffect, useState } from "react";
import { TransactionDetailsFields } from "@/components/transactions/TransactionDetailsFields";
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
import { useDebouncedInput } from "@/hooks/use-debounced-input";
import type { FinancialAccount, TransactionImportItem } from "@/lib/api";
import {
	compareFinancialAccountsByOptionLabel,
	getFinancialAccountOptionLabel,
} from "@/lib/financial-account";

type EditableItem = Pick<
	TransactionImportItem,
	| "amount"
	| "date"
	| "description"
	| "destinationFinancialAccountId"
	| "externalId"
	| "isHidden"
	| "originFinancialAccountId"
	| "storeName"
	| "tagIds"
	| "time"
	| "type"
>;

const toDraft = (item: TransactionImportItem): EditableItem => ({
	amount: item.amount,
	date: item.date.slice(0, 10),
	description: item.description ?? "",
	destinationFinancialAccountId: item.destinationFinancialAccountId ?? null,
	externalId: item.externalId ?? "",
	isHidden: item.isHidden,
	originFinancialAccountId: item.originFinancialAccountId ?? null,
	storeName: item.storeName ?? "",
	tagIds: item.tagIds,
	time: item.time ?? "",
	type: item.type,
});

export function EditImportedTransactionDialog({
	accounts,
	item,
	onOpenChange,
	onSubmit,
	open,
	pending,
}: {
	accounts: FinancialAccount[];
	item: TransactionImportItem | null;
	onOpenChange: (open: boolean) => void;
	onSubmit: (data: EditableItem) => Promise<void>;
	open: boolean;
	pending: boolean;
}) {
	const [draft, setDraft] = useState<EditableItem | null>(() => (item ? toDraft(item) : null));
	const [description, setDescription] = useDebouncedInput(item?.description ?? "", () => undefined);
	const [externalId, setExternalId] = useDebouncedInput(item?.externalId ?? "", () => undefined);
	useEffect(() => {
		if (!item || !open) return;
		setDraft(toDraft(item));
		setDescription(item.description ?? "");
		setExternalId(item.externalId ?? "");
	}, [item, open, setDescription, setExternalId]);
	if (!item || !draft) return null;
	const balanceAccounts = accounts
		.filter(account => account.type !== "CREDIT_CARD" && account.type !== "REWARDS")
		.toSorted(compareFinancialAccountsByOptionLabel);
	const primaryAccountId =
		draft.type === "INCOME" ? draft.destinationFinancialAccountId : draft.originFinancialAccountId;

	return (
		<Dialog onOpenChange={onOpenChange} open={open}>
			<DialogContent className="max-h-[92dvh] grid-rows-[auto_minmax(0,1fr)_auto] sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Editar transação importada</DialogTitle>
					<DialogDescription>Altere antes de aprovar a importação.</DialogDescription>
				</DialogHeader>
				<div className="scrollbar-themed grid min-h-0 gap-4 overflow-y-auto pr-1">
					<TransactionDetailsFields
						amount={String(draft.amount)}
						date={draft.date}
						description={description}
						isHidden={draft.isHidden}
						onAmountChange={amount =>
							setDraft(current => (current ? { ...current, amount: Number(amount) } : current))
						}
						onDateChange={date => setDraft(current => (current ? { ...current, date } : current))}
						onDescriptionChange={setDescription}
						onIsHiddenChange={isHidden => setDraft(current => (current ? { ...current, isHidden } : current))}
						onStoreNameChange={storeName =>
							setDraft(current => (current ? { ...current, storeName } : current))
						}
						onTagIdsChange={tagIds => setDraft(current => (current ? { ...current, tagIds } : current))}
						onTimeChange={time => setDraft(current => (current ? { ...current, time } : current))}
						onTypeChange={type => {
							if (type === "YIELD") return;
							setDraft(current =>
								current
									? {
											...current,
											destinationFinancialAccountId:
												type === "INCOME" ? current.destinationFinancialAccountId : null,
											originFinancialAccountId: type === "INCOME" ? null : current.originFinancialAccountId,
											type,
										}
									: current,
							);
						}}
						showStore={draft.type === "EXPENSE"}
						storeName={draft.storeName ?? ""}
						tagIds={draft.tagIds}
						time={draft.time ?? ""}
						type={draft.type}
					/>
					<FormField
						autoComplete="off"
						id="imported-transaction-external-id"
						label="ID externo"
						name="externalId"
						onChange={event => setExternalId(event.currentTarget.value)}
						placeholder="Ex: 170962950849"
						type="text"
						value={externalId}
					/>
					<CustomSelect
						label={draft.type === "INCOME" ? "Conta de destino" : "Conta de origem"}
						onValueChange={accountId =>
							setDraft(current =>
								current
									? current.type === "INCOME"
										? { ...current, destinationFinancialAccountId: accountId }
										: { ...current, originFinancialAccountId: accountId }
									: current,
							)
						}
						options={balanceAccounts.map(account => ({
							label: getFinancialAccountOptionLabel(account),
							value: account.id,
						}))}
						placeholder="Selecione a conta"
						required
						value={primaryAccountId ?? ""}
					/>
					{draft.type === "TRANSFER" ? (
						<CustomSelect
							label="Conta de destino"
							onValueChange={destinationFinancialAccountId =>
								setDraft(current => (current ? { ...current, destinationFinancialAccountId } : current))
							}
							options={balanceAccounts
								.filter(account => account.id !== draft.originFinancialAccountId)
								.map(account => ({ label: getFinancialAccountOptionLabel(account), value: account.id }))}
							placeholder="Selecione o destino"
							required
							value={draft.destinationFinancialAccountId ?? ""}
						/>
					) : null}
				</div>
				<DialogFooter>
					<Button className="cursor-pointer" onClick={() => onOpenChange(false)} variant="outline">
						Descartar
					</Button>
					<Button
						className="cursor-pointer disabled:cursor-not-allowed"
						disabled={!draft.amount || !primaryAccountId || pending}
						onClick={() => onSubmit({ ...draft, description, externalId })}
					>
						{pending ? "Salvando…" : "Salvar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
