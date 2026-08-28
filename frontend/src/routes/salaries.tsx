import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/salaries")({
	beforeLoad: () => {
		throw redirect({ replace: true, to: "/recurring" });
	},
});
