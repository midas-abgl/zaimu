export class HttpException extends Error {
	readonly statusCode: number;

	constructor(message: string, statusCode: number) {
		super(message);
		this.name = "HttpException";
		this.statusCode = statusCode;
	}
}
