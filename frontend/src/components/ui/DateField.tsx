import type { ComponentProps } from "react";
import { FormField } from "./FormField";

export function DateField(props: Omit<ComponentProps<typeof FormField>, "type">) {
	return <FormField {...props} placeholder={props.placeholder || "Ex: 23/08/2026"} type="date" />;
}
