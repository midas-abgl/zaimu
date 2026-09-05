import { StorePicker } from "@/components/stores";
import { TagPicker } from "@/components/tags";
import { Checkbox } from "@/components/ui/Checkbox";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { DateField } from "@/components/ui/DateField";
import { FormField } from "@/components/ui/FormField";
import { MoneyField } from "@/components/ui/MoneyField";
import type { Transaction } from "@/lib/api";

export function TransactionDetailsFields({
	amount,
	date,
	description,
	onAmountChange,
	onDateChange,
	onIsHiddenChange,
	onSendWithoutTimeChange,
	onTimeChange,
	onDescriptionChange,
	onStoreNameChange,
	onTagIdsChange,
	onTypeChange,
	showDescription = true,
	showTags = true,
	showStore = false,
	storeName,
	sendWithoutTime = false,
	isHidden = false,
	showType = true,
	tagIds,
	time,
	type,
}: {
	amount: string;
	date: string;
	description: string;
	onAmountChange: (amount: string) => void;
	onDateChange: (date: string) => void;
	onIsHiddenChange?: (isHidden: boolean) => void;
	onSendWithoutTimeChange?: (sendWithoutTime: boolean) => void;
	onTimeChange: (time: string) => void;
	onDescriptionChange: (description: string) => void;
	onStoreNameChange: (storeName: string) => void;
	onTagIdsChange: (tagIds: string[]) => void;
	onTypeChange: (type: Transaction["type"]) => void;
	showDescription?: boolean;
	showTags?: boolean;
	showStore?: boolean;
	storeName: string;
	sendWithoutTime?: boolean;
	isHidden?: boolean;
	showType?: boolean;
	tagIds: string[];
	time: string;
	type: Transaction["type"];
}) {
	return (
		<>
			{showType ? (
				<CustomSelect
					label="Tipo"
					onValueChange={value => onTypeChange(value as Transaction["type"])}
					options={[
						{ label: "Saída", value: "EXPENSE" },
						{ label: "Entrada", value: "INCOME" },
						{ label: "Transferência", value: "TRANSFER" },
					]}
					placeholder="Selecione o tipo"
					required
					value={type}
				/>
			) : null}
			<MoneyField
				id="transaction-amount"
				label="Valor"
				onValueChange={onAmountChange}
				required
				value={amount}
			/>
			{showDescription ? (
				<FormField
					autoComplete="off"
					id="transaction-description"
					label="Descrição"
					name="description"
					onChange={event => onDescriptionChange(event.currentTarget.value)}
					placeholder="Ex: Mercado do mês"
					type="text"
					value={description}
				/>
			) : null}
			{showStore ? <StorePicker onValueChange={onStoreNameChange} value={storeName} /> : null}
			<div className="grid gap-4 sm:grid-cols-2">
				<DateField
					id="transaction-date"
					label="Data"
					name="date"
					onChange={event => onDateChange(event.currentTarget.value)}
					required
					value={date}
				/>
				<FormField
					disabled={sendWithoutTime}
					id="transaction-time"
					label="Horário"
					name="time"
					onChange={event => onTimeChange(event.currentTarget.value)}
					type="time"
					value={sendWithoutTime ? "" : time}
				/>
			</div>
			{onSendWithoutTimeChange ? (
				<label className="flex cursor-pointer items-start gap-3 text-sm" htmlFor="transaction-without-time">
					<Checkbox
						checked={sendWithoutTime}
						className="mt-0.5 cursor-pointer"
						id="transaction-without-time"
						onCheckedChange={checked => onSendWithoutTimeChange(checked === true)}
					/>
					<span className="font-medium text-foreground-muted">Enviar sem horário</span>
				</label>
			) : null}
			{onIsHiddenChange ? (
				<label className="flex cursor-pointer items-start gap-3 text-sm" htmlFor="transaction-is-hidden">
					<Checkbox
						checked={isHidden}
						className="mt-0.5 cursor-pointer"
						id="transaction-is-hidden"
						onCheckedChange={checked => onIsHiddenChange(checked === true)}
					/>
					<span className="font-medium text-foreground-muted">Ocultar na lista do dia</span>
				</label>
			) : null}
			{showTags ? <TagPicker onValueChange={onTagIdsChange} value={tagIds} /> : null}
		</>
	);
}
