import { Checkbox } from "@/components/ui/Checkbox";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { NumericField } from "@/components/ui/NumericField";

export function AccountYieldFields({
	enabled,
	fixedRate,
	period,
	referencePercentage,
	referenceRate,
	taxRate,
	onEnabledChange,
	onFixedRateChange,
	onPeriodChange,
	onReferencePercentageChange,
	onReferenceRateChange,
	onTaxRateChange,
}: {
	enabled: boolean;
	fixedRate: string;
	period: "MONTHLY" | "YEARLY";
	referencePercentage: string;
	referenceRate: string;
	taxRate: string;
	onEnabledChange: (enabled: boolean) => void;
	onFixedRateChange: (rate: string) => void;
	onPeriodChange: (period: "MONTHLY" | "YEARLY") => void;
	onReferencePercentageChange: (percentage: string) => void;
	onReferenceRateChange: (rate: string) => void;
	onTaxRateChange: (rate: string) => void;
}) {
	const hasReference = Boolean(referenceRate);
	const hasAnyRate = hasReference || Boolean(fixedRate);
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
				<div className="grid gap-4">
					<p className="text-muted-foreground text-xs">
						Preencha a taxa de referência, a taxa fixa ou ambas.
					</p>
					<div className="grid gap-4 sm:grid-cols-2">
						<NumericField
							decimalScale={4}
							id="account-yield-reference-rate"
							label="Taxa de referência"
							onValueChange={onReferenceRateChange}
							placeholder="Ex: 13,9%"
							suffix="%"
							value={referenceRate}
						/>
						<NumericField
							decimalScale={4}
							id="account-yield-reference-percentage"
							label="Percentual da referência"
							onValueChange={onReferencePercentageChange}
							placeholder="Ex: 105%"
							required={hasReference}
							suffix="%"
							value={referencePercentage}
						/>
						<NumericField
							decimalScale={4}
							id="account-yield-fixed-rate"
							label="Taxa fixa"
							onValueChange={onFixedRateChange}
							placeholder="Ex: 0,5%"
							suffix="%"
							value={fixedRate}
						/>
						<NumericField
							decimalScale={2}
							description="Descontada de cada rendimento automático."
							id="account-yield-tax-rate"
							label="Alíquota de imposto total"
							onValueChange={onTaxRateChange}
							placeholder="Ex: 15%"
							suffix="%"
							value={taxRate}
						/>
						<CustomSelect
							label="Período"
							onValueChange={value => onPeriodChange(value as "MONTHLY" | "YEARLY")}
							options={[
								{ label: "Ao mês (21 dias úteis)", value: "MONTHLY" },
								{ label: "Ao ano (252 dias úteis)", value: "YEARLY" },
							]}
							placeholder="Selecione o período"
							required={hasAnyRate}
							value={period}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
