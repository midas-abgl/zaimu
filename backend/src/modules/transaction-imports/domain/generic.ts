import { HttpException } from "~/shared/errors";
import type { Statement, StatementTransactionType } from "./statement";

const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})\s+(.+?)\s+(?:([+-])\s*)?(?:R\$\s*)?([\d.]+,\d{2})$/u;
const sectionPattern = /^(entradas?|créditos?|recebimentos?|saídas?|débitos?|pagamentos?)$/iu;
const parseCurrency = (value: string) => Number(value.replaceAll(".", "").replace(",", "."));

export function parseGenericStatementText(text: string): Statement {
	const transactions: Statement["transactions"] = [];
	let sectionType: StatementTransactionType | null = null;
	for (const rawLine of text.split("\n")) {
		const line = rawLine.replace(/\s+/gu, " ").trim();
		if (!line) continue;
		const section = line.match(sectionPattern);
		if (section) {
			sectionType = /entrada|crédito|recebimento/iu.test(section[1]) ? "INCOME" : "EXPENSE";
			continue;
		}
		const match = line.match(datePattern);
		if (!match) {
			if (/^\d{2}\/\d{2}\/\d{4}\b/u.test(line))
				throw new HttpException("Há uma movimentação genérica incompleta ou ambígua", 400);
			continue;
		}
		const type = match[5] === "+" ? "INCOME" : match[5] === "-" ? "EXPENSE" : sectionType;
		if (!type) throw new HttpException("Não foi possível identificar a direção de uma movimentação", 400);
		transactions.push({
			amount: parseCurrency(match[6]),
			date: `${match[3]}-${match[2]}-${match[1]}`,
			description: match[4],
			type,
		});
	}
	if (!transactions.length)
		throw new HttpException(
			"O extrato genérico precisa ter data, descrição e valor em cada movimentação",
			400,
		);
	return { provider: "GENERIC", transactions };
}
