import path from "node:path";

const strict = process.argv.includes("--strict");
const required = (name: string) => {
	const value = process.env[name]?.trim();
	if (!value && strict) throw new Error(`${name} é obrigatório para gerar App/Universal Links de produção.`);
	return value;
};

const webUrlValue = required("PUBLIC_WEB_URL");
const appleTeamId = required("APPLE_TEAM_ID");
const androidFingerprint = required("ANDROID_SHA256_CERT_FINGERPRINT");
const bundleId = process.env.TAURI_BUNDLE_ID?.trim() || "com.hyolabs.zaimu";

if (!webUrlValue || !appleTeamId || !androidFingerprint) {
	console.info(
		"App Links não gerados: defina PUBLIC_WEB_URL, APPLE_TEAM_ID e ANDROID_SHA256_CERT_FINGERPRINT.",
	);
	process.exit(0);
}

const webUrl = new URL(webUrlValue);
if (webUrl.protocol !== "https:") throw new Error("PUBLIC_WEB_URL deve usar HTTPS em builds associados.");

const wellKnownDirectory = path.resolve(import.meta.dir, "../public/.well-known");
await Bun.$`mkdir -p ${wellKnownDirectory}`;

await Bun.write(
	path.join(wellKnownDirectory, "apple-app-site-association"),
	JSON.stringify(
		{
			applinks: {
				details: [
					{
						appIDs: [`${appleTeamId}.${bundleId}`],
						components: [
							{ "/": "/auth/verify-email", comment: "Confirmação de e-mail Zaimu" },
							{ "/": "/auth/reset-password", comment: "Recuperação de senha Zaimu" },
						],
					},
				],
			},
		},
		null,
		2,
	),
);

await Bun.write(
	path.join(wellKnownDirectory, "assetlinks.json"),
	JSON.stringify(
		[
			{
				relation: ["delegate_permission/common.handle_all_urls"],
				target: {
					namespace: "android_app",
					package_name: bundleId.replaceAll("-", "_"),
					sha256_cert_fingerprints: [androidFingerprint],
				},
			},
		],
		null,
		2,
	),
);

await Bun.write(
	path.resolve(import.meta.dir, "../src-tauri/tauri.links.conf.json"),
	JSON.stringify(
		{
			bundle: { iOS: { developmentTeam: appleTeamId } },
			plugins: {
				"deep-link": {
					desktop: { schemes: ["zaimu"] },
					mobile: [{ host: webUrl.host, pathPrefix: ["/auth"] }],
				},
			},
		},
		null,
		2,
	),
);

console.info(`App/Universal Links gerados para ${webUrl.host}.`);
