import type { StatusCodes } from "http-status-codes";

export class HttpException extends Error {
	constructor(
		public message: string,
		public statusCode: StatusCodes = 500,
	) {
		super(message);
	}
}
