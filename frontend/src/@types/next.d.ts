import "next";
declare module "next" {
	import type {
		PHASE_DEVELOPMENT_SERVER,
		PHASE_EXPORT,
		PHASE_INFO,
		PHASE_PRODUCTION_BUILD,
		PHASE_PRODUCTION_SERVER,
		PHASE_TEST,
	} from "next/constants";

	interface NextApiRequest extends NextApiRequest {
		file: Express.MulterS3.File;
	}

	export type Phase =
		| typeof PHASE_DEVELOPMENT_SERVER
		| typeof PHASE_EXPORT
		| typeof PHASE_INFO
		| typeof PHASE_PRODUCTION_BUILD
		| typeof PHASE_PRODUCTION_SERVER
		| typeof PHASE_TEST;
}
