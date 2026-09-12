import { TransactionListItem } from "@/components/transactions";
import type { Transaction } from "@/lib/api";
import { formatLocalTime } from "@/lib/date";

export function TransferSuggestionTransactionSummary({ transaction }: { transaction: Transaction }) {
	const time = formatLocalTime(transaction.time);
	return (
		<TransactionListItem
			className="rounded-xl border"
			metadataPrefix={time ? <span className="text-muted-foreground text-xs">{time}</span> : undefined}
			transaction={transaction}
		/>
	);
}
