/**
 * Strict-but-small semver comparator for the MemPalace version gate.
 *
 * Accepts only `MAJOR.MINOR.PATCH` with optional `-<prerelease>` suffix.
 * `Number.parseInt("4-rc1")` happens to return `4`, which would let
 * `3.3.4-rc1` slip past a `>= 3.3.4` gate; we reject any non-numeric
 * core component instead. Pre-release suffixes are treated as STRICTLY
 * LESS than the same `MAJOR.MINOR.PATCH` without one (consistent with
 * semver §11), so `3.3.4-rc.1 < 3.3.4`.
 */

const SEMVER_RE = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

type Parsed = {
	major: number;
	minor: number;
	patch: number;
	prerelease: string | null;
};

const parseSemver = (raw: string): Parsed | null => {
	const match = SEMVER_RE.exec(raw.trim());
	if (!match) return null;
	const [, major, minor, patch, prerelease] = match;
	return {
		major: Number(major),
		minor: Number(minor),
		patch: Number(patch),
		prerelease: prerelease ?? null,
	};
};

export class InvalidSemverError extends Error {
	constructor(value: string) {
		super(`Not a valid semver string: "${value}"`);
		this.name = "InvalidSemverError";
	}
}

export const compareSemver = (a: string, b: string): number => {
	const pa = parseSemver(a);
	const pb = parseSemver(b);
	if (!pa) throw new InvalidSemverError(a);
	if (!pb) throw new InvalidSemverError(b);
	if (pa.major !== pb.major) return pa.major - pb.major;
	if (pa.minor !== pb.minor) return pa.minor - pb.minor;
	if (pa.patch !== pb.patch) return pa.patch - pb.patch;
	if (pa.prerelease === null && pb.prerelease === null) return 0;
	if (pa.prerelease === null) return 1;
	if (pb.prerelease === null) return -1;
	if (pa.prerelease === pb.prerelease) return 0;
	return pa.prerelease < pb.prerelease ? -1 : 1;
};

export const isValidSemver = (raw: string): boolean => parseSemver(raw) !== null;
