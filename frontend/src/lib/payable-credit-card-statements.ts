import { getCreditCardDisplayName } from "./credit-card";
import { dataService } from "./dataService";

export async function getPayableCreditCardStatements(selectedStatementId?: string) {
	const cards = await dataService.creditCards.getAll();
	const statements = await Promise.all(
		cards.map(async card => ({ card, statements: await dataService.creditCards.getStatements(card.id) })),
	);
	return statements
		.flatMap(({ card, statements }) =>
			statements
				.filter(
					statement =>
						statement.id === selectedStatementId || (!statement.isPaid && statement.balanceAmount > 0),
				)
				.map(statement => ({ card, statement })),
		)
		.toSorted((left, right) => {
			const leftDueDate = new Date(left.statement.dueDate);
			const rightDueDate = new Date(right.statement.dueDate);
			const monthOrder =
				leftDueDate.getFullYear() * 12 +
				leftDueDate.getMonth() -
				(rightDueDate.getFullYear() * 12 + rightDueDate.getMonth());

			if (monthOrder !== 0) return monthOrder;
			return getCreditCardDisplayName(left.card).localeCompare(getCreditCardDisplayName(right.card), "pt-BR");
		});
}
