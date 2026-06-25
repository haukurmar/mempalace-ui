import { EmptyState, ErrorState, LoadingState } from "@memui/ui/components";
import type { FC } from "react";

export const SearchEmptyState: FC = () => {
	return (
		<EmptyState
			title="Search the palace"
			description="Type a query above to surface drawers across every wing."
		/>
	);
};

export const SearchLoadingState: FC = () => {
	return <LoadingState label="Searching the palace…" />;
};

type SearchErrorStateProps = {
	error: unknown;
};

export const SearchErrorState: FC<SearchErrorStateProps> = (props) => {
	const { error } = props;
	const message = error instanceof Error ? error.message : "Unknown error";
	return <ErrorState title="Search failed" description={message} />;
};

type SearchNoResultsStateProps = {
	query: string;
};

export const SearchNoResultsState: FC<SearchNoResultsStateProps> = (props) => {
	const { query } = props;
	return (
		<EmptyState
			title="No results"
			description={`Nothing matched "${query}". Try a broader query or relax the metadata filters.`}
		/>
	);
};

export const SearchFiltersUnavailableState: FC = () => {
	return (
		<EmptyState
			title="Filters unavailable"
			description="Metadata filters require the local palace SQLite, which is offline. Open a palace from Settings or remove the filter to search again."
		/>
	);
};
