import { useRef } from "react";
import { LuPlus } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import { CheckboxField } from "@/components/ui/CheckboxField";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { NumericField } from "@/components/ui/NumericField";
import type { DebtSplitInput } from "@/lib/api";
import { calculateDebtSplit, debtSplitError } from "@/lib/debt-split";
import { DebtSplitParticipantRow } from "./DebtSplitParticipantRow";
import type { DebtSplitEditorProps } from "./types";

const currency = new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" });

function equalSplit(
	mode: DebtSplitInput["mode"],
	ids: string[],
	ownerIncluded: boolean,
	amount: number,
): DebtSplitInput {
	if (mode === "SHARES")
		return {
			mode,
			ownerShares: ownerIncluded ? 1 : null,
			participants: ids.map(debtPersonId => ({ debtPersonId, shares: 1 })),
		};
	if (mode === "PERCENTAGE") {
		const divisor = ids.length + (ownerIncluded ? 1 : 0);
		return {
			mode,
			ownerIncluded,
			participants: ids.map((debtPersonId, index) => ({
				debtPersonId,
				percentage:
					index === ids.length - 1 && !ownerIncluded
						? Number((100 - (Math.floor((100 / divisor) * 100) / 100) * (ids.length - 1)).toFixed(2))
						: Math.floor((100 / divisor) * 100) / 100,
			})),
		};
	}
	const totalCents = Math.max(0, Math.round(amount * 100));
	const divisor = ids.length + (ownerIncluded ? 1 : 0);
	const equalCents = divisor ? Math.floor(totalCents / divisor) : 0;
	return {
		mode,
		ownerIncluded,
		participants: ids.map((debtPersonId, index) => ({
			debtPersonId,
			fixedAmount:
				!ownerIncluded && index === ids.length - 1
					? (totalCents - equalCents * (ids.length - 1)) / 100
					: equalCents / 100,
		})),
	};
}

export function DebtSplitEditor({ amount, disabled, onChange, value }: DebtSplitEditorProps) {
	const customized = useRef(false);
	const previewValue = {
		...value,
		participants: value.participants.map((participant, index) => ({
			...participant,
			debtPersonId: `preview-${index}`,
		})),
	} as DebtSplitInput;
	const preview = calculateDebtSplit(amount, previewValue);
	const error = debtSplitError(amount, value);
	const ownerIncluded = value.mode === "SHARES" ? value.ownerShares !== null : value.ownerIncluded;
	const distributed =
		preview?.participants.reduce((sum, participant) => sum + participant.amount, 0) ??
		(value.mode === "FIXED"
			? value.participants.reduce((sum, participant) => sum + participant.fixedAmount, 0)
			: value.mode === "PERCENTAGE"
				? (amount * value.participants.reduce((sum, participant) => sum + participant.percentage, 0)) / 100
				: 0);
	const updateOwner = (included: boolean) => {
		if (value.mode === "SHARES") onChange({ ...value, ownerShares: included ? 1 : null });
		else onChange({ ...value, ownerIncluded: included });
	};
	const updateParticipant = (index: number, field: "debtPersonId" | "value", next: string | number) => {
		if (field === "value") customized.current = true;
		const participants = value.participants.map((participant, participantIndex) => {
			if (participantIndex !== index) return participant;
			if (field === "debtPersonId") return { ...participant, debtPersonId: String(next) };
			if (value.mode === "SHARES") return { ...participant, shares: Number(next) };
			if (value.mode === "PERCENTAGE") return { ...participant, percentage: Number(next) };
			return { ...participant, fixedAmount: Number(next) };
		});
		onChange({ ...value, participants } as DebtSplitInput);
	};
	return (
		<div className="grid min-w-0 max-w-full gap-4 rounded-2xl border p-3 [&>*]:min-w-0">
			<CustomSelect
				label="Forma de divisão"
				onValueChange={mode => {
					customized.current = false;
					onChange(
						equalSplit(
							mode as DebtSplitInput["mode"],
							value.participants.map(item => item.debtPersonId),
							ownerIncluded,
							amount,
						),
					);
				}}
				options={[
					{ label: "Por cotas", value: "SHARES" },
					{ label: "Por porcentagem", value: "PERCENTAGE" },
					{ label: "Por valor", value: "FIXED" },
				]}
				placeholder="Selecione"
				value={value.mode}
			/>
			<p className="text-muted-foreground text-xs">
				Trocar a forma redistribui os valores igualmente.
				{value.mode === "PERCENTAGE" || value.mode === "FIXED"
					? " Valores não distribuídos ficam com você."
					: null}
			</p>
			<CheckboxField
				checkboxProps={{
					checked: ownerIncluded,
					disabled,
					onCheckedChange: checked => updateOwner(checked === true),
				}}
			>
				Incluir minha parte
			</CheckboxField>
			{value.mode === "SHARES" && value.ownerShares !== null ? (
				<NumericField
					decimalScale={0}
					id="debt-split-owner-shares"
					label="Minhas cotas"
					onValueChange={next => {
						customized.current = true;
						onChange({ ...value, ownerShares: Number(next) });
					}}
					placeholder="Ex: 1"
					value={String(value.ownerShares)}
				/>
			) : null}
			{value.participants.map((participant, index) => (
				<DebtSplitParticipantRow
					amount={preview?.participants[index]?.amount}
					disabled={disabled}
					excludedPersonIds={value.participants
						.filter((_, participantIndex) => participantIndex !== index)
						.map(item => item.debtPersonId)
						.filter(Boolean)}
					index={index}
					key={`${index}-${participant.debtPersonId}`}
					mode={value.mode}
					onPersonChange={id => updateParticipant(index, "debtPersonId", id)}
					onRemove={() => {
						const ids = value.participants
							.filter((_, itemIndex) => itemIndex !== index)
							.map(item => item.debtPersonId);
						onChange(
							customized.current
								? ({
										...value,
										participants: value.participants.filter((_, itemIndex) => itemIndex !== index),
									} as DebtSplitInput)
								: equalSplit(value.mode, ids, ownerIncluded, amount),
						);
					}}
					onValueChange={next => updateParticipant(index, "value", next)}
					participant={participant}
				/>
			))}
			<Button
				className="cursor-pointer"
				disabled={disabled}
				onClick={() => {
					if (!customized.current) {
						onChange(
							equalSplit(
								value.mode,
								[...value.participants.map(item => item.debtPersonId), ""],
								ownerIncluded,
								amount,
							),
						);
						return;
					}
					const participant =
						value.mode === "SHARES"
							? { debtPersonId: "", shares: 1 }
							: value.mode === "PERCENTAGE"
								? { debtPersonId: "", percentage: 0 }
								: { debtPersonId: "", fixedAmount: 0 };
					onChange({ ...value, participants: [...value.participants, participant] } as DebtSplitInput);
				}}
				type="button"
				variant="outline"
			>
				<LuPlus /> Adicionar pessoa
			</Button>
			<div className="grid min-w-0 grid-cols-3 gap-2 overflow-hidden rounded-xl bg-muted/50 p-3 text-xs">
				<span className="min-w-0 overflow-hidden">
					Distribuído<strong className="block text-sm">{currency.format(distributed)}</strong>
				</span>
				<span className="min-w-0 overflow-hidden">
					Sua parte<strong className="block text-sm">{currency.format(preview?.ownerAmount ?? 0)}</strong>
				</span>
				<span className="min-w-0 overflow-hidden">
					Restante
					<strong className="block text-sm">
						{currency.format(amount - distributed - (preview?.ownerAmount ?? 0))}
					</strong>
				</span>
			</div>
			{error ? <p className="text-destructive text-xs">{error}</p> : null}
		</div>
	);
}
