// `mempalace_search` does not accept a `where` arg in v3.3.4. This stub is
// always false today — flip the comparison the day upstream MemPalace exposes
// `where` on the search tool. The post-filter callback exists for the
// transitional period.
export const mcpSupportsWhere = (_serverVersion: string): boolean => false;
