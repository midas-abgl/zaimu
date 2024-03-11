import fastifyHelmet from "@fastify/helmet";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

	app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, whitelist: true }));

	await app.register(fastifyHelmet);
	app.enableCors(process.env.NODE_ENV === "production" ? { origin: process.env.WEB_URL } : {});

	const config = new DocumentBuilder().setTitle("Zaimu's API").setDescription("").setVersion("1.0.0").build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup("docs", app, document);

	const port = process.env.PORT || 3333;

	await app.listen(port, "0.0.0.0");

	console.log(`Server started on port ${port}!`);
}

bootstrap();
