import "react";

declare module "react" {
	interface CSSProperties extends CSSProperties {
		[variable: string]: string | number;
	}
}
