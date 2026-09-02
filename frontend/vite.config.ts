import "dotenv/config";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const host = process.env.TAURI_DEV_HOST || "0.0.0.0";
const port = Number(process.env.PORT || 5173);

const hmrHost = process.env.VITE_PUBLIC_WEB_URL || host;
const isHttps = hmrHost.includes("https");

const hmr = {
	host: hmrHost.replace(/https?:\/\//, ""),
	port: isHttps ? 443 : port + 1,
	protocol: isHttps ? "wss" : "ws",
};

export default defineConfig({
	build: {
		minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
		sourcemap: !!process.env.TAURI_ENV_DEBUG,
		target: "es2022",
	},
	clearScreen: false,
	envPrefix: ["VITE_", "TAURI_"],
	plugins: [TanStackRouterVite({ routeFileIgnorePattern: "^components$" }), react(), tailwindcss()],
	resolve: {
		alias: {
			"@": resolve(import.meta.dirname, "./src"),
		},
	},
	server: {
		allowedHosts: ["vite.hyoretsu.com", hmr.host],
		hmr,
		host,
		port,
		strictPort: true,
		watch: {
			ignored: ["**/src-tauri/**"],
		},
	},
});
