import { PDFParse } from "pdf-parse";
import { HttpException } from "~/shared/errors";
import { parseGenericStatementText } from "./generic";
import { parseMercadoPagoStatementText } from "./mercado-pago";
import { parseNubankStatementText } from "./nubank";
import type { Statement, StatementProvider } from "./statement";

const knownParsers: Array<{
	detect: (text: string) => boolean;
	parse: (text: string) => Statement;
	provider: Exclude<StatementProvider, "GENERIC">;
}> = [
	{
		detect: text => /EXTRATO DE CONTA/iu.test(text) && /ID da operação/iu.test(text),
		parse: parseMercadoPagoStatementText,
		provider: "MERCADO_PAGO",
	},
	{
		detect: text => /Nu Pagamentos S\.A\.|Movimentações/iu.test(text),
		parse: parseNubankStatementText,
		provider: "NUBANK",
	},
];

export async function parseStatementPdf(
	data: ArrayBuffer,
	requestedProvider: StatementProvider,
): Promise<Statement> {
	const parser = new PDFParse({ data: new Uint8Array(data) });
	try {
		const { text } = await parser.getText();
		if (!text.trim()) throw new HttpException("Não foi possível extrair texto do PDF", 400);
		if (requestedProvider !== "GENERIC") {
			const provider = knownParsers.find(candidate => candidate.provider === requestedProvider)!;
			return provider.parse(text);
		}
		const known = knownParsers.find(candidate => candidate.detect(text));
		return known ? known.parse(text) : parseGenericStatementText(text);
	} catch (error) {
		if (error instanceof HttpException) throw error;
		throw new HttpException("Não foi possível ler o PDF do extrato", 400);
	} finally {
		await parser.destroy();
	}
}
