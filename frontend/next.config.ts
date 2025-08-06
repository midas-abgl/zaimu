import type { NextConfig, Phase } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const withNextIntl = createNextIntlPlugin();

export default async (phase: Phase, { defaultConfig }): Promise<NextConfig> => {
	const baseConf = {
		eslint: {
			ignoreDuringBuilds: true,
		},
		experimental: {
			turbo: {
				rules: {
					"*.svg": {
						loaders: ["@svgr/webpack"],
						as: "*.js",
					},
				},
			},
		},
		productionBrowserSourceMaps: true,
		reactStrictMode: true,
		sassOptions: {
			logger: {
				warn: message => console.warn(message),
				debug: message => console.log(message),
			},
		},
		skipTrailingSlashRedirect: true,
		swcMinify: true,
		typescript: {
			ignoreBuildErrors: true,
		},
		webpack: (config, options) => {
			config.module.rules.push({
				test: /\.svg$/i,
				use: ["@svgr/webpack"],
			});

			return config;
		},
	} satisfies NextConfig;

	// Dev-specific settings
	if (phase === PHASE_DEVELOPMENT_SERVER) {
		Object.assign(baseConf, {});
	} else {
		Object.assign(baseConf, {});
	}

	return withNextIntl(baseConf);
};
