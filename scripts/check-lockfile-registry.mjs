import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const NPMJS = "https://registry.npmjs.org/";

// TODO(WAL-13249): Chainguard withheld these versions on 2026-10-27, so they pin npmjs.org. The
// follow-up should first evaluate whether these packages are needed at all.
const NPMJS_PINNED = new Set([
    "bitcoinjs-lib@6.1.10",
    "@dynamic-labs/wallet-book@4.100.5",
    "@noxcturnal/noxcturnal-linux-arm64-gnu@0.1.2",
    "@noxcturnal/noxcturnal-win32-arm64-msvc@0.1.2",
    "@noxcturnal/noxcturnal-win32-x64-msvc@0.1.2",
]);

const routing = { default: NPMJS, scopes: {} };
for (const line of readFileSync(join(root, ".npmrc"), "utf8").split("\n")) {
    const match = /^(@[^:]+:)?registry=(\S+)$/.exec(line.trim());
    if (match == null) {
        continue;
    }
    const registry = match[2].endsWith("/") ? match[2] : `${match[2]}/`;
    if (match[1] == null) {
        routing.default = registry;
    } else {
        routing.scopes[match[1].slice(0, -1)] = registry;
    }
}

const lock = readFileSync(join(root, "pnpm-lock.yaml"), "utf8");
const section = lock.split("\npackages:\n")[1]?.split("\nsnapshots:\n")[0];
if (section == null) {
    console.error("pnpm-lock.yaml has no packages section");
    process.exit(1);
}
const lines = section.split("\n");
const entries = [];
const problems = [];
let unreadable = 0;
for (let i = 0; i < lines.length; i++) {
    const keyMatch = /^ {2}('?)(\S[^'\n]*?)\1:$/.exec(lines[i]);
    if (keyMatch == null) {
        continue;
    }
    const resolutionMatch = /^ {4}resolution: \{([^}]*)\}$/.exec(lines[i + 1] ?? "");
    if (resolutionMatch == null) {
        problems.push(`${keyMatch[2]}: cannot read its resolution (expected a one-line mapping on the next line)`);
        unreadable++;
        continue;
    }
    entries.push([keyMatch[2], resolutionMatch[1]]);
}
for (const [key, resolution] of entries) {
    const at = key.lastIndexOf("@");
    const name = key.slice(0, at);
    const version = key.slice(at + 1);
    const tarball = /tarball: '?([^',}]+)/.exec(resolution)?.[1];
    if (tarball == null) {
        problems.push(`${key}: no tarball URL`);
        continue;
    }
    if (!tarball.endsWith(`/${name}/-/${name.split("/").pop()}-${version}.tgz`)) {
        problems.push(`${key}: tarball is ${tarball}`);
        continue;
    }
    const scope = name.startsWith("@") ? name.split("/")[0] : null;
    const expected = NPMJS_PINNED.has(key) ? NPMJS : (scope && routing.scopes[scope]) || routing.default;
    if (new URL(tarball).origin !== new URL(expected).origin) {
        problems.push(`${key}: ${tarball} is not on ${expected}`);
    }
}
if (entries.length === 0 && unreadable === 0) {
    problems.push("no registry entries found: the lockfile format may have changed");
}
if (problems.length > 0) {
    console.error(
        `${problems.length} of ${entries.length + unreadable} pnpm-lock.yaml entries do not resolve from their routed registry:`
    );
    for (const problem of problems.slice(0, 20)) {
        console.error(`  ${problem}`);
    }
    process.exit(1);
}
console.log(`All ${entries.length} pnpm-lock.yaml entries resolve from their routed registry`);
