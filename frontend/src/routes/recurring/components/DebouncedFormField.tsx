import type { ComponentProps } from "react";
import { FormField } from "@/components/ui/FormField";
import { useDebouncedInput } from "@/hooks/use-debounced-input";

export function DebouncedFormField({
	onValueChange,
	value,
	...props
}: Omit<ComponentProps<typeof FormField>, "onChange" | "value"> & {
	onValueChange: (value: string) => void;
	value: string;
}) {
	const [localValue, setLocalValue] = useDebouncedInput(value, onValueChange);

	return (
		<FormField {...props} onChange={event => setLocalValue(event.currentTarget.value)} value={localValue} />
	);
}
