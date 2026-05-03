import { QueryClient } from "@tanstack/react-query";

export const createQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: {
				// SQLite reads are fast; 30s avoids thrash on rapid nav while keeping data fresh.
				staleTime: 30_000,
				refetchOnWindowFocus: false,
				retry: 1,
			},
		},
	});
