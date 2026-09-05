import type { DebtSplitInput } from "@/lib/api";

export interface DebtSplitEditorProps {
	amount: number;
	disabled?: boolean;
	onChange: (value: DebtSplitInput) => void;
	value: DebtSplitInput;
}
