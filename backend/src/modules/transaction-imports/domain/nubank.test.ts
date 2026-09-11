import { describe, expect, test } from "bun:test";
import { parseNubankStatementText } from "./nubank";

const statementText = `
01 DE AGOSTO DE 2026 a 31 DE AGOSTO DE 2026 VALORES EM R$
Movimentações
03 AGO 2026 Total de entradas + 2.649,00
Transferência recebida pelo Pix IFOOD PAGO INSTITUICAO DE PAGAMENTO S A -
19.468.242/0001-32 - BCO SANTANDER (BRASIL) S.
A. (0033) Agência: 2247 Conta: 13001069-9
300,00
Transferência recebida pelo Pix Lucas Gomes Dantas - PICPAY
249,00
Transferência recebida pelo Pix FUND.COORD.DE APERF.DE PESSOAL NIVEL SUPERIOR
2.100,00
Total de saídas - 2.649,00
Transferência enviada pelo Pix MERCADO PAGO IP LTDA.
300,00
Transferência enviada pelo Pix MERCADO PAGO IP LTDA.
2.349,00
06 AGO 2026 Total de entradas + 13,64
Tem alguma dúvida? Mande uma mensagem para nosso time de atendimento.
-- 1 of 2 --
Transferência recebida pelo Pix Maria Eduarda Ribeiro Donato da Silva
13,64
13 AGO 2026 Total de saídas - 13,64
Transferência enviada pelo Pix MERCADO PAGO IP LTDA.
13,64
Nu Pagamentos S.A. - Instituição de Pagamento
`;

describe("parseNubankStatementText", () => {
	test("preserva a seção aberta entre páginas e confere totais", () => {
		const statement = parseNubankStatementText(statementText);
		expect(statement).toMatchObject({
			periodEnd: "2026-08-31",
			periodStart: "2026-08-01",
			provider: "NUBANK",
		});
		expect(statement.transactions).toEqual([
			{
				amount: 300,
				date: "2026-08-03",
				description:
					"Transferência recebida pelo Pix IFOOD PAGO INSTITUICAO DE PAGAMENTO S A - 19.468.242/0001-32 - BCO SANTANDER (BRASIL) S. A. (0033) Agência: 2247 Conta: 13001069-9",
				type: "INCOME",
			},
			{
				amount: 249,
				date: "2026-08-03",
				description: "Transferência recebida pelo Pix Lucas Gomes Dantas - PICPAY",
				type: "INCOME",
			},
			{
				amount: 2100,
				date: "2026-08-03",
				description: "Transferência recebida pelo Pix FUND.COORD.DE APERF.DE PESSOAL NIVEL SUPERIOR",
				type: "INCOME",
			},
			{
				amount: 300,
				date: "2026-08-03",
				description: "Transferência enviada pelo Pix MERCADO PAGO IP LTDA.",
				type: "EXPENSE",
			},
			{
				amount: 2349,
				date: "2026-08-03",
				description: "Transferência enviada pelo Pix MERCADO PAGO IP LTDA.",
				type: "EXPENSE",
			},
			{
				amount: 13.64,
				date: "2026-08-06",
				description: "Transferência recebida pelo Pix Maria Eduarda Ribeiro Donato da Silva",
				type: "INCOME",
			},
			{
				amount: 13.64,
				date: "2026-08-13",
				description: "Transferência enviada pelo Pix MERCADO PAGO IP LTDA.",
				type: "EXPENSE",
			},
		]);
	});
});
