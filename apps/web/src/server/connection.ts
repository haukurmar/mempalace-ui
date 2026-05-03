import { type Connection, connect } from "@memui/palace-clients";
import { startWatch } from "./watch";

type ConnectionGlobal = { __mempalConn?: Promise<Connection> | null };
const g = globalThis as ConnectionGlobal;

let connectionPromise: Promise<Connection> | null = g.__mempalConn ?? null;

const setPromise = (p: Promise<Connection> | null): void => {
	connectionPromise = p;
	g.__mempalConn = p;
};

export const getConnection = (): Promise<Connection> => {
	if (connectionPromise === null) {
		const p = (async () => {
			try {
				const conn = await connect({
					palacePath: process.env.MEMPAL_PALACE_PATH,
				});
				if (conn.status.sqlite.status === "ok") {
					startWatch(conn.status.palacePath);
				}
				return conn;
			} catch (err) {
				setPromise(null);
				throw err;
			}
		})();
		setPromise(p);
	}
	return connectionPromise as Promise<Connection>;
};

export const disposeConnection = async (): Promise<void> => {
	if (connectionPromise === null) return;
	const conn = await connectionPromise.catch(() => null);
	setPromise(null);
	if (conn) await conn.dispose();
};

// Survive Vite HMR reloads of this module so we don't orphan the mempalace-mcp child;
// the next module instance picks up the live connection via globalThis.
if (import.meta.hot) {
	import.meta.hot.dispose(() => {});
}
