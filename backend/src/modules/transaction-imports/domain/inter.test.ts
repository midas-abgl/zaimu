import { describe, expect, test } from "bun:test";
import { parseInterStatementText } from "./inter";

describe("parseInterStatementText", () => {
	test("lê entradas, saídas e saldo por transação", () => {
		const statement = parseInterStatementText(`
CPF/CNPJ: 000.000.000-00, Instituição: Banco Inter, Agência: 0001-9, Conta: 12345678-9
Período: 01/07/2026 a 30/07/2026
Valor \tSaldo por transação\t19 de Julho de 2026 Saldo do dia: R$ 312,52
Pix recebido: "Pessoa" \tR$ 312,52 \tR$ 312,52
22 de Julho de 2026 Saldo do dia: R$ 0,00
Pagamento efetuado: "Pagamento fatura cartao Inter" \t-R$ 312,52 \tR$ 0,00
Fale com a gente
`);

		expect(statement).toEqual({
			periodEnd: "2026-07-30",
			periodStart: "2026-07-01",
			provider: "INTER",
			transactions: [
				{
					amount: 312.52,
					balanceAfter: 312.52,
					date: "2026-07-19",
					description: 'Pix recebido: "Pessoa"',
					type: "INCOME",
				},
				{
					amount: 312.52,
					balanceAfter: 0,
					date: "2026-07-22",
					description: 'Pagamento efetuado: "Pagamento fatura cartao Inter"',
					type: "EXPENSE",
				},
			],
		});
	});
});
