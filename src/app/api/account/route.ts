import { db } from "../../../database";

export async function POST(request: Request) {
	const requestBody = await request.json();

	if (!requestBody.name) {
		throw new Error("O nome é obrigatório.");
	}

	const currentTime = new Date().toISOString();

	const result = await db
		.insertInto("Account")
		.values({
			name: requestBody.name,
		})
		.returningAll()
		.execute();

	console.log(result);

	const responseData = {
		name: requestBody.name,
		createdAt: currentTime,
		updatedAt: currentTime,
	};

	return Response.json(responseData);
}
