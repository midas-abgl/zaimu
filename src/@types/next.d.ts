import { NextApiRequest } from "next";

declare module "next" {
	export interface NextApiRequest extends NextApiRequest {
		file: Express.MulterS3.File;
	}
}
