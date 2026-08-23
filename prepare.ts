import { $ } from "bun";

await Promise.all([$`git config --local core.hooksPath .githooks`.quiet()]);
