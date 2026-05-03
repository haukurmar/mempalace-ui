import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { TestRunnerConfig } from "@storybook/test-runner";

const config: TestRunnerConfig = {
	async postVisit(page, context) {
		const image = await page.screenshot();
		const target = resolve(process.cwd(), "__snapshots__", `${context.id}.png`);
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, image);
	},
};

export default config;
