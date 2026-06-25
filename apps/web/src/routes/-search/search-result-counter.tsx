import type { FC } from "react";

export type SearchResultCounterProps = {
	displayedCount: number;
	totalAfterFilter: number;
	candidatesScanned: number;
};

/**
 * Renders the post-filter count line.
 *
 * Three signals matter to a user who applied a `where` clause:
 * 1. `displayedCount` — rows actually rendered (= `results.length`).
 * 2. `totalAfterFilter` — rows that survived the filter; can exceed
 *    `displayedCount` when the page-limit slice clipped the list.
 * 3. `candidatesScanned` — pool size before the filter ran.
 *
 * Hidden entirely when no filter is in play (totalAfterFilter ===
 * candidatesScanned). When a slice occurred (totalAfterFilter >
 * displayedCount) we surface that explicitly so users know there are
 * more matches than they're seeing.
 */
export const SearchResultCounter: FC<SearchResultCounterProps> = (props) => {
	const { displayedCount, totalAfterFilter, candidatesScanned } = props;
	if (totalAfterFilter === candidatesScanned) return null;
	const sliced = displayedCount < totalAfterFilter;
	return (
		<p className="px-1 pb-2 font-mono text-xs text-secondary-700">
			{sliced
				? `Showing ${displayedCount} of ${totalAfterFilter} matches (${candidatesScanned} candidates scanned)`
				: `Showing ${totalAfterFilter} of ${candidatesScanned} candidates after filtering`}
		</p>
	);
};
