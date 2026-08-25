import { HttpException } from "~/shared/errors";

export function assertCreditCardBillingDays(statementDay: number, dueDay: number) {
	if (statementDay >= dueDay) {
		throw new HttpException("O vencimento deve ser posterior ao fechamento da fatura", 400);
	}
}
