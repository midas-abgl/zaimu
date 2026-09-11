import { describe, expect, test } from "bun:test";
import { parsePicPayStatementText } from "./picpay";

describe("parsePicPayStatementText", () => {
	test("lê datas, horários, valores e detalhes do extrato", () => {
		const statement = parsePicPayStatementText(`
Período Saldo final do período
Extrato de conta
15 de março de 2026 a
10 de setembro de 2026
R$ 0,00
07 de setembro 2026 Saldo ao final do dia: R$ 0,00
Hora Tipo Valor\tOrigem / Destino Forma de pagamento
06:38 Pagamento realizado −R$ 11,99\tAssinatura PicPay Mais Com cartão
23 de julho 2026 Saldo ao final do dia: R$ 0,00
Hora Tipo Valor\tOrigem / Destino Forma de pagamento
11:27 Pagamento realizado −R$ 140,05\tFatura PicPay Card Com saldo
11:26 Pix recebido +R$ 137,93\tAran Leite de Gusmao
29 de junho 2026 Saldo ao final do dia: R$ 2,12
Hora Tipo Valor\tOrigem / Destino Forma de pagamento
14:19 Cashback recebido +R$ 1,02
Documento emitido em: PicPay Serviços S/A
`);

		expect(statement).toEqual({
			periodEnd: "2026-09-10",
			periodStart: "2026-03-15",
			provider: "PICPAY",
			transactions: [
				{
					amount: 11.99,
					date: "2026-09-07",
					description: "Pagamento realizado Assinatura PicPay Mais Com cartão",
					time: "06:38",
					type: "EXPENSE",
				},
				{
					amount: 140.05,
					date: "2026-07-23",
					description: "Pagamento realizado Fatura PicPay Card Com saldo",
					time: "11:27",
					type: "EXPENSE",
				},
				{
					amount: 137.93,
					date: "2026-07-23",
					description: "Pix recebido Aran Leite de Gusmao",
					time: "11:26",
					type: "INCOME",
				},
				{
					amount: 1.02,
					date: "2026-06-29",
					description: "Cashback recebido",
					time: "14:19",
					type: "INCOME",
				},
			],
		});
	});
});
