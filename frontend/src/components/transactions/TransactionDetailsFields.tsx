import { StorePicker } from "@/components/stores";
import { TagPicker } from "@/components/tags";
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
	onDescriptionChange,
	onStoreNameChange,
	onTagIdsChange,
	onTypeChange,
	showDescription = true,
	showTags = true,
	showStore = false,
	storeName,
	showType = true,
	tagIds,
	type,
}: {
	amount: string;
	date: string;
	description: string;
	onAmountChange: (amount: string) => void;
	onDateChange: (date: string) => void;
	onDescriptionChange: (description: string) => void;
	onStoreNameChange: (storeName: string) => void;
	onTagIdsChange: (tagIds: string[]) => void;
	onTypeChange: (type: Transaction["type"]) => void;
	showDescription?: boolean;
	showTags?: boolean;
	showStore?: boolean;
	storeName: string;
	showType?: boolean;
	tagIds: string[];
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
			<DateField
				id="transaction-date"
				label="Data"
				name="date"
				onChange={event => onDateChange(event.currentTarget.value)}
				required
				value={date}
			/>
			{showTags ? <TagPicker onValueChange={onTagIdsChange} value={tagIds} /> : null}
		</>
	);
}
