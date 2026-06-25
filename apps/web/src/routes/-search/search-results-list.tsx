import type { SearchResult } from "@memui/palace-types/search";
import { ResultRow } from "@memui/ui/components";
import type { FC } from "react";

export type SearchResultsListProps = {
	results: ReadonlyArray<SearchResult>;
	onSelect: (result: SearchResult) => void;
};

export const SearchResultsList: FC<SearchResultsListProps> = (props) => {
	const { results, onSelect } = props;

	return (
		<ul className="flex flex-col gap-1">
			{results.map((result, index) => (
				<SearchResultsListItem
					key={result.drawerId ?? `${result.wing.id}/${result.room.id}/${index}`}
					result={result}
					onSelect={onSelect}
				/>
			))}
		</ul>
	);
};

type SearchResultsListItemProps = {
	result: SearchResult;
	onSelect: (result: SearchResult) => void;
};

const SearchResultsListItem: FC<SearchResultsListItemProps> = (props) => {
	const { result, onSelect } = props;

	const handleSelect = () => {
		if (!result.drawerId) return;
		onSelect(result);
	};

	const adapted = {
		drawerId: result.drawerId ?? "",
		snippet: result.snippet,
		wing: { id: result.wing.id, name: result.wing.name },
		room: { id: result.room.id, name: result.room.name },
		scores: { cosine: result.scores.cosine, bm25: result.scores.bm25 },
		updatedAt: result.updatedAt,
	};

	const isResolvable = Boolean(result.drawerId);

	return (
		<li>
			<ResultRow
				result={adapted}
				onClick={isResolvable ? handleSelect : undefined}
				disabled={!isResolvable}
				disabledReason="Click-through unavailable — drawer id could not be resolved."
			/>
		</li>
	);
};
