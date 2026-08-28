import type { ComponentProps } from "react";
import { MoneyField } from "@/components/ui/MoneyField";
import { useDebouncedInput } from "@/hooks/use-debounced-input";

export function DebouncedMoneyField({
	onValueChange,
	value,
	...props
}: Omit<ComponentProps<typeof MoneyField>, "onValueChange" | "value"> & {
	onValueChange: (value: string) => void;
	value: string;
}) {
	const [localValue, setLocalValue] = useDebouncedInput(value, onValueChange);

	return <MoneyField {...props} onValueChange={setLocalValue} value={localValue} />;
}
