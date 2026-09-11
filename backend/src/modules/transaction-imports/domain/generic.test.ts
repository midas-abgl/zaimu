import { describe, expect, test } from "bun:test";
import { parseGenericStatementText } from "./generic";

describe("parseGenericStatementText", () => {
	test("lê linhas com data, descrição e sinal", () => {
		expect(
			parseGenericStatementText("03/08/2026 Pix recebido + R$ 300,00\n04/08/2026 Pagamento - R$ 10,50")
				.transactions,
		).toEqual([
			{ amount: 300, date: "2026-08-03", description: "Pix recebido", type: "INCOME" },
			{ amount: 10.5, date: "2026-08-04", description: "Pagamento", type: "EXPENSE" },
		]);
	});

	test("usa a seção quando o valor não tem sinal", () => {
		expect(parseGenericStatementText("Entradas\n03/08/2026 Pix recebido R$ 300,00").transactions[0]).toEqual({
			amount: 300,
			date: "2026-08-03",
			description: "Pix recebido",
			type: "INCOME",
		});
	});
});
