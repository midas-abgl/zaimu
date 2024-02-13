import "@hyoretsu/react-hooks";
import { Equipment } from "backend";

declare module "@hyoretsu/react-hooks" {
	interface APIMapping {
		"/equips": Equipment[];
		"/equips/filter": Equipment[];
		"/equips/find": Equipment | Equipment[];
		"/exp": Array<{ level: number; exp: number }>;
	}
}
