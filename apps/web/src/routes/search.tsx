import type { SearchResponse, SearchResult } from "@memui/palace-types/search";
import { FilterRuleBuilder, type Group, type WhereClause } from "@memui/ui/components";
import { ListDetailLayout } from "@memui/ui/patterns";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { type FC, useEffect, useMemo, useState } from "react";
import { searchSemantic } from "../server/functions";
import {
	groupFromFiltersParam,
	parseFiltersParam,
	SEARCH_FILTER_FIELDS,
	stringifyFiltersParam,
} from "./-search/filter-state";
import { SearchInput } from "./-search/search-input";
import {
	SearchEmptyState,
	SearchErrorState,
	SearchFiltersUnavailableState,
	SearchLoadingState,
	SearchNoResultsState,
} from "./-search/search-page-states";
import { SearchResultCounter } from "./-search/search-result-counter";
import { SearchResultsList } from "./-search/search-results-list";
import { type SearchHistoryEntry, useSearchHistory } from "./-search/use-search-history";
import { DrawerDetail } from "./browse/-components/drawer-detail";

export type SearchPageSearch = {
	q?: string;
	wing?: string;
	filters?: string;
	drawer?: string;
};

const validateSearchParams = (raw: Record<string, unknown>): SearchPageSearch => {
	const out: SearchPageSearch = {};
	if (typeof raw.q === "string" && raw.q.length > 0) out.q = raw.q;
	if (typeof raw.wing === "string" && raw.wing.length > 0) out.wing = raw.wing;
	if (typeof raw.filters === "string" && raw.filters.length > 0) out.filters = raw.filters;
	if (typeof raw.drawer === "string" && raw.drawer.length > 0) out.drawer = raw.drawer;
	return out;
};

const SEARCH_LIMIT = 25;

const SearchPage: FC = () => {
	const search = Route.useSearch();
	const navigate = useNavigate();

	const activeQuery = search.q ?? "";
	const activeWing = search.wing;
	const activeFiltersParam = search.filters;

	const [draftQuery, setDraftQuery] = useState(activeQuery);
	const [filterGroup, setFilterGroup] = useState<Group | null>(() =>
		groupFromFiltersParam(activeFiltersParam),
	);

	useEffect(() => {
		setDraftQuery(activeQuery);
	}, [activeQuery]);

	useEffect(() => {
		setFilterGroup(groupFromFiltersParam(activeFiltersParam));
	}, [activeFiltersParam]);

	const { entries: history, record: recordHistory } = useSearchHistory(activeWing);

	const queryEnabled = activeQuery.length > 0;

	const activeWhere = useMemo(() => parseFiltersParam(activeFiltersParam), [activeFiltersParam]);

	const searchQuery = useQuery({
		queryKey: ["palace", "search", activeQuery, activeWing ?? null, activeFiltersParam ?? null],
		queryFn: () =>
			searchSemantic({
				data: {
					query: activeQuery,
					limit: SEARCH_LIMIT,
					...(activeWing ? { wing: activeWing } : {}),
					...(activeWhere ? { where: activeWhere } : {}),
				},
			}),
		enabled: queryEnabled,
	});

	useEffect(() => {
		// We only record on a successful response — recording on every
		// keystroke would flood storage with intermediate queries.
		if (searchQuery.isSuccess && activeQuery.length > 0) {
			recordHistory(activeQuery);
		}
	}, [searchQuery.isSuccess, activeQuery, recordHistory]);

	const orderedResults = useMemo<SearchResult[]>(() => {
		const data = searchQuery.data;
		if (!data) return [];
		// MemPalace's own ranking comes back ordered by combined relevance;
		// preserve server order. Returning a fresh array keeps downstream
		// hooks honest about identity.
		return [...data.results];
	}, [searchQuery.data]);

	const handleQueryChange = (next: string) => {
		setDraftQuery(next);
	};

	const handleSubmitQuery = (queryText: string) => {
		void navigate({
			to: "/search",
			search: (prev) => ({
				...prev,
				q: queryText,
			}),
		});
	};

	const handleHistorySelect = (entry: SearchHistoryEntry) => {
		setDraftQuery(entry.query);
		void navigate({
			to: "/search",
			search: (prev) => ({
				...prev,
				q: entry.query,
			}),
		});
	};

	const handleFilterChange = (next: Group) => {
		setFilterGroup(next);
	};

	const handleFilterApply = (where: WhereClause | null) => {
		const filtersParam = stringifyFiltersParam(where);
		void navigate({
			to: "/search",
			search: (prev) => {
				const { filters: _drop, ...rest } = prev;
				return filtersParam !== undefined ? { ...rest, filters: filtersParam } : rest;
			},
		});
	};

	// Open the detail as an in-context overlay over the search results by setting
	// the `drawer` param on the CURRENT route — q/wing/filters are preserved, so
	// closing the detail returns the user to their results exactly as they were.
	const handleSelectResult = (result: SearchResult) => {
		const drawerId = result.drawerId;
		// Respect the unresolved-drawer disabled state — inert rows can't open.
		if (!drawerId) return;
		void navigate({
			to: "/search",
			search: (prev) => ({ ...prev, drawer: drawerId }),
		});
	};

	// Clear ONLY the `drawer` param; q/wing/filters survive so the results list
	// (and its preserved active-index cursor) stay put behind the closing panel.
	const handleCloseDetail = () => {
		void navigate({
			to: "/search",
			search: (prev) => {
				const { drawer: _drop, ...rest } = prev;
				return rest;
			},
		});
	};

	const activeDrawerId = search.drawer;

	const filterSidebar = (
		<div className="h-full overflow-y-auto p-4">
			<FilterRuleBuilder
				fields={SEARCH_FILTER_FIELDS}
				value={filterGroup ?? undefined}
				onChange={handleFilterChange}
				onApply={handleFilterApply}
			/>
		</div>
	);

	return (
		<div className="flex h-full w-full flex-col">
			<header className="flex shrink-0 flex-col gap-3 border-b border-secondary-200 bg-background px-6 py-4">
				<SearchInput
					value={draftQuery}
					onChange={handleQueryChange}
					onSubmit={handleSubmitQuery}
					history={history}
					onHistorySelect={handleHistorySelect}
					autoFocus
				/>
			</header>
			<div className="min-h-0 flex-1">
				<ListDetailLayout
					sidebar={filterSidebar}
					sidebarWidth="w-80"
					main={
						<main className="px-6 py-4">
							<SearchPageBody
								query={activeQuery}
								isFetching={searchQuery.isFetching}
								isError={searchQuery.isError}
								error={searchQuery.error}
								response={searchQuery.data}
								results={orderedResults}
								onSelectResult={handleSelectResult}
							/>
						</main>
					}
					detail={
						activeDrawerId ? (
							<DrawerDetail drawerId={activeDrawerId} onClose={handleCloseDetail} />
						) : null
					}
					detailOpen={Boolean(activeDrawerId)}
					onDetailClose={handleCloseDetail}
				/>
			</div>
		</div>
	);
};

type SearchPageBodyProps = {
	query: string;
	isFetching: boolean;
	isError: boolean;
	error: unknown;
	response: SearchResponse | undefined;
	results: ReadonlyArray<SearchResult>;
	onSelectResult: (result: SearchResult) => void;
};

// Server-fn errors arrive serialized — TanStack Start preserves `name`
// and own enumerable properties, so we match on the typed `code`
// discriminator carried by `PalaceUnavailableError`. Avoids brittle
// substring matching against the human-readable message.
const isFiltersUnavailableError = (error: unknown): boolean => {
	if (!error || typeof error !== "object") return false;
	const name = (error as { name?: unknown }).name;
	const code = (error as { code?: unknown }).code;
	return name === "PalaceUnavailableError" && code === "filters_unavailable";
};

const SearchPageBody: FC<SearchPageBodyProps> = (props) => {
	const { query, isFetching, isError, error, response, results, onSelectResult } = props;

	if (query.length === 0) return <SearchEmptyState />;
	if (isError) {
		if (isFiltersUnavailableError(error)) return <SearchFiltersUnavailableState />;
		return <SearchErrorState error={error} />;
	}
	if (isFetching && results.length === 0) return <SearchLoadingState />;
	if (results.length === 0) return <SearchNoResultsState query={query} />;

	return (
		<div className="flex flex-col">
			{response ? (
				<SearchResultCounter
					displayedCount={results.length}
					totalAfterFilter={response.totalAfterFilter}
					candidatesScanned={response.candidatesScanned}
				/>
			) : null}
			<SearchResultsList results={results} onSelect={onSelectResult} />
		</div>
	);
};

export const Route = createFileRoute("/search")({
	component: SearchPage,
	validateSearch: validateSearchParams,
});
