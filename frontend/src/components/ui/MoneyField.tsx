import type { ComponentProps } from "react";
import { NumericFormat } from "react-number-format";
import { Input } from "./Input";
import { Label } from "./Label";
import { RequiredMark } from "./RequiredMark";

export function MoneyField({
	id,
	label,
	onValueChange,
	required,
	value,
	...props
}: Omit<ComponentProps<typeof Input>, "defaultValue" | "onChange" | "type" | "value"> & {
	label: string;
	onValueChange: (value: string) => void;
	value: string;
}) {
	return (
		<div className="grid gap-2">
			<Label htmlFor={id}>
				<span>
					{label} {required && <RequiredMark />}
				</span>
			</Label>
			<NumericFormat
				autoComplete="off"
				customInput={Input}
				decimalScale={2}
				decimalSeparator=","
				fixedDecimalScale
				getInputRef={undefined}
				id={id}
				inputMode="decimal"
				name={id}
				onValueChange={values => onValueChange(values.value)}
				placeholder="R$ 1.500,00"
				prefix="R$ "
				required={required}
				thousandSeparator="."
				value={value}
				valueIsNumericString
				{...props}
			/>
		</div>
	);
}
