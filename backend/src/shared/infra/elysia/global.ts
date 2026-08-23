import Elysia from "elysia";
import { HttpException } from "~/shared/errors";

export const GlobalPlugin = new Elysia({ name: "GlobalPlugin" })
	.error({ HttpException })
	.onError(({ code, error, set }) => {
		if (code === "HttpException") {
			set.status = error.statusCode;
			return { error: error.message };
		}

		console.error(error);
		return { error: "Internal Server Error" };
	})
	.as("global");
