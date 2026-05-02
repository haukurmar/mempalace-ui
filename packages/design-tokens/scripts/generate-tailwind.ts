/**
 * Generates dist/tailwind.preset.css from the canonical token modules.
 * Idempotent — overwrites the file on every run.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { toTailwindTheme } from "../src/adapters/tailwind";

const here = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(here, "..", "dist", "tailwind.preset.css");
const header = "/* Generated from @memui/design-tokens — do not edit by hand. */\n";

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, header + toTailwindTheme(), "utf8");

console.log(`wrote ${outPath}`);
