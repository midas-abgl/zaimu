import type { ComponentProps, ReactNode } from "react";
import { useId } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils";

type CheckboxFieldProps = Omit<ComponentProps<"label">, "children" | "htmlFor"> & {
	align?: "center" | "start";
	checkboxProps: ComponentProps<typeof Checkbox>;
	children: ReactNode;
};

function CheckboxField({
	align = "center",
	checkboxProps,
	children,
	className,
	...props
}: CheckboxFieldProps) {
	const generatedId = useId();
	const { className: checkboxClassName, id = generatedId, ...restCheckboxProps } = checkboxProps;

	return (
		<label
			className={cn(
				"flex w-fit max-w-full cursor-pointer gap-3 rounded-xl bg-transparent px-2 py-1.5 text-sm transition-colors focus-within:bg-muted/70 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/50 hover:bg-muted/70 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50",
				align === "start" ? "items-start" : "items-center",
				className,
			)}
			htmlFor={id}
			{...props}
		>
			<Checkbox
				className={cn(align === "start" && "mt-0.5", checkboxClassName)}
				id={id}
				{...restCheckboxProps}
			/>
			<span>{children}</span>
		</label>
	);
}

export { CheckboxField };
