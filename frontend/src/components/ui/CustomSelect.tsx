import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./Select";

interface Option {
	label: string;
	value: string;
}

export function CustomSelect({
	label,
	onValueChange,
	options,
	placeholder,
	required,
	sortOptions = true,
	value,
}: {
	label: string;
	onValueChange: (value: string) => void;
	options: Option[];
	placeholder: string;
	required?: boolean;
	sortOptions?: boolean;
	value?: string;
}) {
	const displayedOptions = sortOptions
		? options.toSorted((left, right) =>
				left.label.localeCompare(right.label, "pt-BR", { sensitivity: "base" }),
			)
		: options;

	return (
		<div className="grid gap-2">
			<p className="font-medium text-sm leading-none">
				{label} {required && <span className="text-destructive">*</span>}
			</p>
			<Select onValueChange={onValueChange} value={value}>
				<SelectTrigger aria-label={label} className="h-10 w-full cursor-pointer">
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{displayedOptions.map(option => (
						<SelectItem className="cursor-pointer" key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}
