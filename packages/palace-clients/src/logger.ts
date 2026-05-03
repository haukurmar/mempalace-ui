/**
 * Minimal logger contract for library-internal diagnostics. Library code
 * never writes to `console.*` directly; consumers inject a logger
 * (default falls back to `console`) so server frameworks can route the
 * output to their own structured-logging pipeline.
 */
export type Logger = {
	info?: (message: string) => void;
	warn?: (message: string) => void;
	error?: (message: string) => void;
};

export const defaultLogger: Logger = {
	info: (message) => console.info(message),
	warn: (message) => console.warn(message),
	error: (message) => console.error(message),
};
