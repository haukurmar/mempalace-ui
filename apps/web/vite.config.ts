import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
	server: {
		// Single-user developer tool: bind to localhost only, never expose on the LAN.
		host: "127.0.0.1",
		port: Number(process.env.MEMPAL_UI_PORT ?? 3000),
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
