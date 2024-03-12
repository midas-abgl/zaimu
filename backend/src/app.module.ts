import { AccountsModule } from "@modules/accounts/accounts.module";
import { Module } from "@nestjs/common";
import { PostgresDialect } from "kysely";
import { KyselyModule } from "nestjs-kysely";
import { Pool } from "pg";

@Module({
	imports: [
		KyselyModule.forRoot({
			dialect: new PostgresDialect({
				pool: new Pool({
					connectionString: process.env.DATABASE_URL,
				}),
			}),
		}),
		AccountsModule,
	],
	providers: [],
})
export class AppModule {}
