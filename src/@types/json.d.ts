declare module "@data/equips/arcane_force.json" {
	import { Equipment } from "maple-simulator";

	const content: Equipment[];

	export default content;
}

declare module "@data/equips/sacred_force.json" {
	import { Equipment } from "maple-simulator";

	const content: Equipment[];

	export default content;
}

declare module "@data/classes.json" {
	import { PlayableClass } from "maple-simulator";

	const content: PlayableClass[];

	export default content;
}

declare module "@data/symbols.json" {
	interface SymbolInfo {
		cost: {
			mesos: Record<string, Record<string | number, number>>;
			symbols: Record<string | number, number>;
		};
		reqLevel: Record<string, number>;
	}

	const content: {
		Arcane: SymbolInfo;
		Sacred: SymbolInfo;
	};

	export default content;
}

declare module "@data/worlds.json" {
	import { World } from "maple-simulator";

	const content: World[];

	export default content;
}
