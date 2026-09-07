import { Checkbox } from "@/components/ui/Checkbox";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { NumericField } from "@/components/ui/NumericField";

export function AccountYieldFields({
	enabled,
	period,
	rate,
	onEnabledChange,
	onPeriodChange,
	onRateChange,
}: {
	enabled: boolean;
	period: "MONTHLY" | "YEARLY";
	rate: string;
	onEnabledChange: (enabled: boolean) => void;
	onPeriodChange: (period: "MONTHLY" | "YEARLY") => void;
	onRateChange: (rate: string) => void;
}) {
	return (
		<div className="grid gap-4 rounded-2xl border bg-muted/35 p-4">
			<label className="flex cursor-pointer items-start gap-3 text-sm" htmlFor="account-yield-enabled">
				<Checkbox
					checked={enabled}
					className="mt-0.5 cursor-pointer"
					id="account-yield-enabled"
					onCheckedChange={checked => onEnabledChange(checked === true)}
				/>
				<span>
					<strong className="block">Esta conta rende</strong>
					<span className="text-muted-foreground">
						Calculado diariamente de segunda a sexta. Feriados pausam todas as contas.
					</span>
				</span>
			</label>
			{enabled && (
				<div className="grid gap-4 sm:grid-cols-2">
					<NumericField
						decimalScale={4}
						id="account-yield-rate"
						label="Taxa"
						onValueChange={onRateChange}
						placeholder="Ex: 0,95%"
						required
						suffix="%"
						value={rate}
					/>
					<CustomSelect
						label="Período"
						onValueChange={value => onPeriodChange(value as "MONTHLY" | "YEARLY")}
						options={[
							{ label: "Ao mês (21 dias úteis)", value: "MONTHLY" },
							{ label: "Ao ano (252 dias úteis)", value: "YEARLY" },
						]}
						placeholder="Selecione o período"
						required
						value={period}
					/>
				</div>
			)}
		</div>
	);
}
