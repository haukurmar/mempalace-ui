import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Graph view (cosmos.gl): @cosmos.gl/graph statically imports gl-bench, a
// CJS/UMD FPS overlay whose `default` export the rolldown optimizer can't
// interop. The /graph route never uses cosmos's built-in FPS monitor, so we
// alias gl-bench to a no-op stub.
const glBenchShim = fileURLToPath(
	new URL("./src/graph/renderer/gl-bench-shim.ts", import.meta.url),
);

export default defineConfig({
	server: {
		// Single-user developer tool: bind to localhost only, never expose on the LAN.
		host: "127.0.0.1",
		port: Number(process.env.MEMPAL_UI_PORT ?? 3000),
	},
	resolve: {
		tsconfigPaths: true,
		// Graph view: swap gl-bench (cosmos's CJS/UMD FPS overlay, un-interop'able
		// by rolldown) for a no-op stub — the /graph route never uses it.
		alias: {
			"gl-bench": glBenchShim,
		},
	},
	// Graph view: force-bundle the cosmos engine and its CJS sub-deps so their
	// default exports get proper ESM interop in dev.
	optimizeDeps: {
		include: ["@cosmos.gl/graph", "seedrandom", "random"],
	},
	plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
