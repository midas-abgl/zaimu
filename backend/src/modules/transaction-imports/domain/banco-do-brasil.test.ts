import { describe, expect, test } from "bun:test";
import { parseBancoDoBrasilStatementText } from "./banco-do-brasil";

describe("parseBancoDoBrasilStatementText", () => {
	test("lê Pix recebidos e enviados, preservando documento como ID", () => {
		const statement = parseBancoDoBrasilStatementText(`
Extrato de Conta Corrente
Período: 01 a 11/09/2026
Lançamentos
Pix - Recebido
11/09/2026 3165 110329433997781 11/09 03:29 Pessoa 10,00 (+)
Pix - Enviado
11/09/2026 3165 91101 10,00 (-)
11/09 03:30 Pessoa
SALDO 0,00 (+)
`);

		expect(statement).toEqual({
			periodEnd: "2026-09-11",
			periodStart: "2026-09-01",
			provider: "BANCO_DO_BRASIL",
			transactions: [
				{
					amount: 10,
					date: "2026-09-11",
					description: "Pix - Recebido 11/09 03:29 Pessoa",
					externalId: "banco-do-brasil:110329433997781",
					type: "INCOME",
				},
				{
					amount: 10,
					date: "2026-09-11",
					description: "Pix - Enviado 11/09 03:30 Pessoa",
					externalId: "banco-do-brasil:91101",
					type: "EXPENSE",
				},
			],
		});
	});
});
