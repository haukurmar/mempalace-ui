#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const targets = [".claude", ".codex"];
const sharedFolders = ["skills"];

function exists(p) {
	return fs.existsSync(p);
}

function safeRealPath(p) {
	try {
		return fs.realpathSync(p);
	} catch {
		return path.resolve(p);
	}
}

function ensureLink(targetDir, folderName) {
	const sourceDir = path.resolve(rootDir, ".agents", folderName);
	fs.mkdirSync(targetDir, { recursive: true });

	const linkPath = path.join(targetDir, folderName);
	const sourceReal = safeRealPath(sourceDir);

	if (!exists(sourceDir)) {
		console.warn(`Skipping ${linkPath}: missing source ${sourceDir}.`);
		return;
	}

	if (exists(linkPath)) {
		const stats = fs.lstatSync(linkPath);

		if (!stats.isSymbolicLink()) {
			console.warn(`Skipping ${linkPath}: exists and is not a symlink.`);
			return;
		}

		const currentTarget = fs.readlinkSync(linkPath);
		const currentResolved = safeRealPath(
			path.resolve(path.dirname(linkPath), currentTarget),
		);

		if (currentResolved === sourceReal) {
			console.log(`OK ${linkPath}`);
			return;
		}

		fs.rmSync(linkPath, { recursive: true, force: true });
	}

	const symlinkType = process.platform === "win32" ? "junction" : "dir";
	fs.symlinkSync(sourceDir, linkPath, symlinkType);
	console.log(`Linked ${linkPath} -> ${sourceDir}`);
}

for (const dir of targets) {
	for (const folder of sharedFolders) {
		ensureLink(path.resolve(rootDir, dir), folder);
	}
}
