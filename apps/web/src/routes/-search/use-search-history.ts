import { useCallback, useEffect, useState } from "react";

const HISTORY_CAP = 20;
const STORAGE_KEY_PREFIX = "mempalace-ui:search-history";

export type SearchHistoryEntry = {
	query: string;
	at: string; // ISO timestamp
};

const storageKey = (wingId: string | undefined): string => {
	const scope = wingId && wingId.length > 0 ? wingId : "all";
	return `${STORAGE_KEY_PREFIX}:${scope}`;
};

const readEntries = (key: string): SearchHistoryEntry[] => {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		const valid: SearchHistoryEntry[] = [];
		for (const entry of parsed) {
			if (
				entry !== null &&
				typeof entry === "object" &&
				typeof (entry as SearchHistoryEntry).query === "string" &&
				typeof (entry as SearchHistoryEntry).at === "string"
			) {
				valid.push(entry as SearchHistoryEntry);
			}
		}
		return valid.slice(0, HISTORY_CAP);
	} catch {
		return [];
	}
};

const writeEntries = (key: string, entries: SearchHistoryEntry[]) => {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(key, JSON.stringify(entries.slice(0, HISTORY_CAP)));
	} catch {
		// localStorage can throw (quota, private mode). History is a
		// nice-to-have — never let it break search.
	}
};

/**
 * Per-wing search history backed by `localStorage`. Cap of 20 entries,
 * dedupe on exact query string (case-sensitive). Most recent first.
 *
 * `wingId` is `undefined` for the unscoped global view; entries land
 * under the `…:all` key. Entries for one wing are not visible from
 * another — switching wings refreshes the entry list, but data for the
 * previous wing remains intact under its own key.
 */
export const useSearchHistory = (wingId: string | undefined) => {
	const key = storageKey(wingId);
	const [entries, setEntries] = useState<SearchHistoryEntry[]>(() => readEntries(key));

	useEffect(() => {
		setEntries(readEntries(key));
	}, [key]);

	const record = useCallback(
		(query: string) => {
			const trimmed = query.trim();
			if (trimmed.length === 0) return;
			const next: SearchHistoryEntry = { query: trimmed, at: new Date().toISOString() };
			setEntries((prev) => {
				const filtered = prev.filter((entry) => entry.query !== trimmed);
				const updated = [next, ...filtered].slice(0, HISTORY_CAP);
				writeEntries(key, updated);
				return updated;
			});
		},
		[key],
	);

	const clear = useCallback(() => {
		writeEntries(key, []);
		setEntries([]);
	}, [key]);

	return { entries, record, clear };
};

export const SEARCH_HISTORY_CAP = HISTORY_CAP;
