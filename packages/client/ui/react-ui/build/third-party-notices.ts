import { mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { Options } from "tsup";
import upstreamNotices from "./licenses/upstream-notices.json";

type BuildPlugin = NonNullable<Options["esbuildPlugins"]>[number];
type PackageOwner = { directory: string; name: string; version: string; license?: string };
type UpstreamNotice = {
    declaredLicense: string | null;
    manifestUrl: string;
    tarballUrl: string;
    integrity: string;
    upstreamNotice?: { text: string; url: string; verification: string; exactReleaseLicenseFile: boolean };
};
const supplements: Record<string, UpstreamNotice> = upstreamNotices.packages;

const noticeName = /^(?:licen[cs]es?|copying|copyright|notice)(?:[._-].*)?$/i;

async function packageOwner(file: string, cache: Map<string, PackageOwner | null>): Promise<PackageOwner | null> {
    // Distribution folders may repeat their package's named manifest but omit its license.
    // The last node_modules boundary identifies the installed package, including scoped/nested installs.
    const parts = file.split(sep);
    const modulesIndex = parts.lastIndexOf("node_modules");
    const packageEnd = modulesIndex + (parts[modulesIndex + 1]?.startsWith("@") ? 3 : 2);
    const packageRoot = modulesIndex >= 0 ? parts.slice(0, packageEnd).join(sep) : undefined;
    let directory = packageRoot ?? dirname(file);
    const visited: string[] = [];
    let owner: PackageOwner | null = null;
    while (directory !== dirname(directory)) {
        if (cache.has(directory)) {
            owner = cache.get(directory) ?? null;
            break;
        }
        visited.push(directory);
        try {
            const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
            if (typeof manifest.name === "string") {
                owner = {
                    directory,
                    name: manifest.name,
                    version: manifest.version ?? "unversioned",
                    license: typeof manifest.license === "string" ? manifest.license : undefined,
                };
                break;
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        directory = dirname(directory);
    }
    for (const path of visited) cache.set(path, owner);
    return owner;
}

async function noticeFiles(owner: PackageOwner): Promise<string[]> {
    const files: string[] = [];
    async function add(path: string): Promise<void> {
        if ((await stat(path)).isDirectory()) {
            for (const entry of (await readdir(path)).sort()) await add(join(path, entry));
        } else {
            files.push(path);
        }
    }
    for (const name of (await readdir(owner.directory)).sort()) {
        if (noticeName.test(name)) await add(join(owner.directory, name));
    }
    const referencedLicense = owner.license?.match(/^SEE LICEN[CS]E IN (.+)$/i)?.[1];
    if (referencedLicense) {
        const path = resolve(owner.directory, referencedLicense);
        if (!files.includes(path)) {
            try {
                await add(path);
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
            }
        }
    }
    return files;
}

function rejectUnsafeInput(owner: PackageOwner, file: string): void {
    const path = relative(owner.directory, file).split(sep).join("/");
    if (
        owner.name === "sharp" ||
        owner.name.startsWith("@img/sharp-") ||
        ["bindings", "node-gyp-build", "node-gyp-build-optional-packages"].includes(owner.name) ||
        file.endsWith(".node")
    ) {
        throw new Error(`Browser bundle contains native dependency ${owner.name}/${path}.`);
    }
    if (owner.name === "bigint-buffer") {
        throw new Error(`Browser bundle contains bigint-buffer/${path}; use the internal pure-JS adapter instead of redistributing the affected dependency.`);
    }
    if (owner.name === "ws" && (path === "index.js" || path.startsWith("lib/"))) {
        throw new Error(`Browser bundle selected Node ws implementation (${path}); use its browser entry or native WebSocket.`);
    }
}

/** Preserve notices for the actual bundled dependency graph, across both output formats. */
export function thirdPartyNoticesPlugin(outDir: string): BuildPlugin {
    const graphs = new Map<object, { workingDirectory: string; inputs: string[] }>();
    let pending: Promise<void> = Promise.resolve();

    return {
        name: "third-party-notices",
        setup(build) {
            build.initialOptions.metafile = true;
            build.initialOptions.legalComments = "inline";
            build.onEnd(async (result) => {
                if (result.errors.length > 0 || !result.metafile) return;
                pending = pending.catch(() => undefined).then(async () => {
                    graphs.set(build, {
                        workingDirectory: build.initialOptions.absWorkingDir ?? process.cwd(),
                        inputs: Object.keys(result.metafile!.inputs),
                    });
                    const owners = new Map<string, PackageOwner>();
                    const cache = new Map<string, PackageOwner | null>();
                    for (const graph of graphs.values()) {
                        for (const input of graph.inputs) {
                            if (!input.split(/[\\/]/).includes("node_modules")) continue;
                            const file = await realpath(isAbsolute(input) ? input : resolve(graph.workingDirectory, input));
                            const owner = await packageOwner(file, cache);
                            if (!owner || owner.name.startsWith("@crossmint/")) continue;
                            rejectUnsafeInput(owner, file);
                            owners.set(owner.directory, owner);
                        }
                    }
                    const packages = new Map<string, Map<string, string>>();
                    for (const owner of owners.values()) {
                        const identity = `${owner.name}@${owner.version}`;
                        const files = await noticeFiles(owner);
                        const supplement = supplements[identity];
                        const manifestUrl = supplement?.manifestUrl ?? `https://registry.npmjs.org/${owner.name}/${owner.version}`;
                        const notices = packages.get(identity) ?? new Map<string, string>();
                        notices.set("!metadata", `Declared license: ${owner.license ?? "NOASSERTION"}\nUpstream npm metadata: ${manifestUrl}\nUpstream artifact integrity: ${supplement?.integrity ?? "NOASSERTION (not recorded)"}\n${supplement ? `Upstream artifact: ${supplement.tarballUrl}\n` : ""}`);
                        for (const file of files) {
                            const text = await readFile(file, "utf8");
                            const name = relative(owner.directory, file).split(sep).join("/");
                            notices.set(`${name}\0${text}`, `--- ${name} ---\n${text.trimEnd()}\n`);
                        }
                        if (files.length === 0) {
                            const source = supplement?.upstreamNotice;
                            const metadataMatches = supplement?.declaredLicense === (owner.license ?? null);
                            if (source && metadataMatches) {
                                notices.set("!upstream-notice", `--- Supplemental upstream notice ---\nSource: ${source.url}\nProvenance: ${source.verification}\n\n${source.text.trimEnd()}\n`);
                            } else {
                                notices.set("!unavailable", "Published license/notice files: unavailable. No additional license terms or copyright owner have been inferred. Existing code comments remain in the bundle.\n");
                            }
                        }
                        packages.set(identity, notices);
                    }
                    const sections = [...packages.keys()].sort().map((identity) => {
                        const notices = packages.get(identity)!;
                        return `=== ${identity} ===\n\n${[...notices.keys()].sort().map((key) => notices.get(key)).join("\n")}`;
                    });
                    await mkdir(outDir, { recursive: true });
                    await writeFile(
                        join(outDir, "THIRD_PARTY_NOTICES.txt"),
                        `Third-party notices for code bundled into @crossmint/client-sdk-react-ui.\nGenerated from the esbuild input graph.\n\n${sections.join("\n")}\n`
                    );
                });
                await pending;
            });
        },
    };
}
