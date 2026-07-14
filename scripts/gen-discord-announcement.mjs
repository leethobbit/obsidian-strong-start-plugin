/**
 * Generate a Discord release announcement from CHANGELOG.md.
 * (Ported from Inkswell/obsidian-scribe-plugin's release tooling.)
 *
 * Pulls the section for the release (the version in manifest.json by default)
 * and reformats it for a Discord post: a `##` top header naming the plugin,
 * version, and an optional tagline, then `###` sections (What's new / Changed
 * / Bug fixes / Removed) carrying the changelog bullets verbatim.
 * Discord-incompatible markdown links are flattened
 * (`[text](url)` → `text (<url>)` or just `text`).
 *
 * Prints the message to stdout and, unless `--stdout`, appends it (after a
 * `---` separator) to the dev-vault announcement file so it's ready to copy
 * out of Obsidian.
 *
 * Usage:
 *   node scripts/gen-discord-announcement.mjs [options]
 *     --version=X.Y.Z   Version to show in the header / section to read.
 *                       Default: the version in manifest.json.
 *     --unreleased      Read the `[Unreleased]` section instead (preview
 *                       before the bump promotes it). Pair with --version to
 *                       set the header to the intended number.
 *     --tagline="..."   One-line tagline after the version in the header.
 *     --out=PATH        Append target. Default: lazy-dev-vault/Discord announcement.md
 *     --stdout          Print only; don't append to the file.
 */

import { appendFileSync, existsSync, readFileSync } from "fs";

const PLUGIN_DISPLAY_NAME = "Strong Start";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => {
	const hit = args.find((a) => a.startsWith(`--${name}=`));
	return hit ? hit.slice(name.length + 3) : dflt;
};

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const displayVersion = opt("version", manifest.version);
const sectionLabel = flag("unreleased") ? "Unreleased" : opt("version", manifest.version);
const tagline = opt("tagline", "");
const outPath = opt("out", "lazy-dev-vault/Discord announcement.md");

// Section title + emoji per Keep-a-Changelog group, in display order.
const SECTIONS = [
	["Added", "✨ What's new"],
	["Changed", "🔧 Changed"],
	["Fixed", "🐛 Bug fixes"],
	["Removed", "🗑️ Removed"],
];

const lines = readFileSync("CHANGELOG.md", "utf8").split(/\r?\n/);
const startRe = new RegExp(`^## \\[${escapeRe(sectionLabel)}\\]`);
const start = lines.findIndex((l) => startRe.test(l));
if (start < 0) {
	console.error(`[announce] No CHANGELOG section "## [${sectionLabel}]" found.`);
	process.exit(1);
}

// Collect lines until the next "## [" header, then bucket bullets by subsection.
const buckets = {};
let cur = null;
for (let j = start + 1; j < lines.length; j++) {
	const line = lines[j];
	if (/^## \[/.test(line)) break;
	const head = line.match(/^### (\w+)/);
	if (head) {
		cur = head[1];
		buckets[cur] = buckets[cur] ?? [];
		continue;
	}
	if (!cur) continue;
	if (/^\s*[-*] /.test(line)) {
		buckets[cur].push(discordify(line.replace(/^\s*[-*] /, "").trim()));
	} else if (line.trim() && buckets[cur].length) {
		// Fold a wrapped continuation line into the current bullet.
		buckets[cur][buckets[cur].length - 1] += " " + discordify(line.trim());
	}
}

const header = tagline
	? `## ${PLUGIN_DISPLAY_NAME} v${displayVersion} — ${tagline}`
	: `## ${PLUGIN_DISPLAY_NAME} v${displayVersion}`;
const out = [header];
for (const [key, title] of SECTIONS) {
	const items = buckets[key];
	if (!items || items.length === 0) continue;
	out.push("", `### ${title}`, ...items.map((it) => `- ${it}`));
}
if (out.length === 1) {
	console.error(`[announce] CHANGELOG section "${sectionLabel}" has no Added/Changed/Fixed/Removed entries.`);
	process.exit(1);
}
const message = out.join("\n") + "\n";

process.stdout.write(message);

if (!flag("stdout")) {
	if (existsSync(outPath)) {
		appendFileSync(outPath, `\n\n---\n\n${message}`);
		console.error(`\n[announce] appended to ${outPath}`);
	} else {
		console.error(`\n[announce] ${outPath} not found — printed above only (pass --out= to target a file).`);
	}
}

/** Flatten Discord-incompatible markdown links: external → "text (<url>)", internal → "text". */
function discordify(s) {
	return s
		.replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, "$1 (<$2>)")
		.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function escapeRe(s) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
