import { LuArrowLeftRight, LuEye } from "react-icons/lu";
import { Button } from "@/components/ui/Button";
import type { TransactionImportTransferSuggestion } from "@/lib/api";

export function TransferSuggestionActions({
	accountNames,
	disabled,
	onView,
	suggestions,
}: {
	accountNames: Map<string, string>;
	disabled: boolean;
	onView: (suggestion: TransactionImportTransferSuggestion) => void;
	suggestions: TransactionImportTransferSuggestion[];
}) {
	if (!suggestions.length) return null;
	return (
		<div className="space-y-2">
			{suggestions.map(suggestion => (
				<div
					className="grid w-full min-w-0 gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3"
					key={suggestion.id}
				>
					<span className="flex min-w-0 items-start gap-1.5 text-primary text-xs">
						<LuArrowLeftRight aria-hidden="true" />
						<span className="min-w-0 break-words">
							Transferência sugerida com {accountNames.get(suggestion.financialAccountId) ?? "outra conta"}
						</span>
					</span>
					<div>
						<Button
							aria-label={`Ver transferência sugerida com ${accountNames.get(suggestion.financialAccountId) ?? "outra conta"}`}
							className="w-full cursor-pointer disabled:cursor-not-allowed"
							disabled={disabled}
							onClick={() => onView(suggestion)}
							size="sm"
							variant="outline"
						>
							<LuEye aria-hidden="true" /> Ver transação
						</Button>
					</div>
				</div>
			))}
		</div>
	);
}
