import { type FSWatcher, statSync, watch } from "node:fs";
import { join } from "node:path";

const DEBOUNCE_MS = 500;

// 0 = "no event observed yet" sentinel; clients can distinguish "no writes since boot" from "writes happened".
let lastChangeAt = 0;
let watcher: FSWatcher | null = null;
let debounceTimer: NodeJS.Timeout | null = null;
let watchedPath: string | null = null;

const bumpDebounced = () => {
	if (debounceTimer !== null) clearTimeout(debounceTimer);
	debounceTimer = setTimeout(() => {
		lastChangeAt = Date.now();
		debounceTimer = null;
	}, DEBOUNCE_MS);
};

export const startWatch = (palacePath: string): void => {
	if (watcher !== null && watchedPath === palacePath) return;
	stopWatch();
	watchedPath = palacePath;
	try {
		// Watch the palace directory; chroma.sqlite3 / -wal / -shm churn under it.
		watcher = watch(palacePath, { persistent: false }, (_eventType, filename) => {
			if (filename === null) {
				bumpDebounced();
				return;
			}
			const name = filename.toString();
			if (name.startsWith("chroma.sqlite3")) bumpDebounced();
		});
		watcher.on("error", () => {
			// On platforms where fs.watch is flaky, just stop watching; the
			// UI can still poll via the change-stamp server function.
			stopWatch();
		});
	} catch {
		watcher = null;
	}
	// Probe chroma.sqlite3 so missing-file shows up in logs early instead of silently mis-watching.
	try {
		statSync(join(palacePath, "chroma.sqlite3"));
	} catch (err) {
		console.warn(`[watch] chroma.sqlite3 not found under ${palacePath}: ${(err as Error).message}`);
	}
};

export const stopWatch = (): void => {
	if (debounceTimer !== null) {
		clearTimeout(debounceTimer);
		debounceTimer = null;
	}
	if (watcher !== null) {
		try {
			watcher.close();
		} catch {
			// already closed.
		}
		watcher = null;
	}
	watchedPath = null;
};

export const getLastChangeAt = (): number => lastChangeAt;

export const __setLastChangeAtForTest = (value: number): void => {
	lastChangeAt = value;
};
