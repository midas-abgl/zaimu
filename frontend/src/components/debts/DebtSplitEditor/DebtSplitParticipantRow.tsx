import { LuTrash2 } from "react-icons/lu";
import { DebtPersonPicker } from "@/components/debts/DebtPersonPicker";
import { Button } from "@/components/ui/Button";
import { MoneyField } from "@/components/ui/MoneyField";
import { NumericField } from "@/components/ui/NumericField";
import type { DebtSplitInput } from "@/lib/api";

export function DebtSplitParticipantRow({
	amount,
	disabled,
	excludedPersonIds,
	index,
	onPersonChange,
	onRemove,
	onValueChange,
	participant,
	mode,
}: {
	amount?: number;
	disabled?: boolean;
	excludedPersonIds?: string[];
	index: number;
	mode: DebtSplitInput["mode"];
	onPersonChange: (id: string) => void;
	onRemove: () => void;
	onValueChange: (value: number) => void;
	participant: DebtSplitInput["participants"][number];
}) {
	const numericValue =
		mode === "SHARES"
			? String((participant as { shares: number }).shares || "")
			: mode === "PERCENTAGE"
				? String((participant as { percentage: number }).percentage || "")
				: String((participant as { fixedAmount: number }).fixedAmount || "");
	return (
		<div className="grid gap-3 rounded-xl border p-3">
			<div className="flex items-end gap-2">
				<div className="min-w-0 flex-1">
					<DebtPersonPicker
						disabled={disabled}
						excludedIds={excludedPersonIds}
						onValueChange={onPersonChange}
						required
						value={participant.debtPersonId}
					/>
				</div>
				<Button
					aria-label="Remover pessoa"
					className="cursor-pointer"
					disabled={disabled}
					onClick={onRemove}
					size="icon"
					type="button"
					variant="outline"
				>
					<LuTrash2 />
				</Button>
			</div>
			{mode === "FIXED" ? (
				<MoneyField
					id={`debt-split-${index}`}
					label="Valor"
					onValueChange={value => onValueChange(Number(value))}
					value={numericValue}
				/>
			) : (
				<NumericField
					decimalScale={mode === "PERCENTAGE" ? 2 : 0}
					id={`debt-split-${index}`}
					label={mode === "SHARES" ? "Cotas" : "Porcentagem"}
					onValueChange={value => onValueChange(Number(value))}
					placeholder={mode === "SHARES" ? "Ex: 1" : "Ex: 25%"}
					suffix={mode === "PERCENTAGE" ? "%" : undefined}
					value={numericValue}
				/>
			)}
			{amount !== undefined ? (
				<p className="text-muted-foreground text-xs">
					Parcela: {new Intl.NumberFormat("pt-BR", { currency: "BRL", style: "currency" }).format(amount)}
				</p>
			) : null}
		</div>
	);
}
