import { readFileSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import type { Plugin, ResolveOptions, ResolveResult } from "esbuild";

interface CheckoutExternalsOptions {
    sourceRoot: string;
    runtimeDependencies: Iterable<string>;
}

function canonicalPath(path: string) {
    try {
        return realpathSync(path);
    } catch {
        return resolve(path);
    }
}

function packageName(specifier: string) {
    const parts = specifier.split("/");
    return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

function packageRoot(path: string): string | undefined {
    let directory = dirname(path);
    while (true) {
        try {
            // Some packages have nested package.json files containing only a module type.
            const manifest = JSON.parse(readFileSync(resolve(directory, "package.json"), "utf8"));
            if (manifest.name) {
                return canonicalPath(directory);
            }
        } catch {
            // Keep walking when this directory has no package manifest.
        }
        const parent = dirname(directory);
        if (parent === directory) {
            return undefined;
        }
        directory = parent;
    }
}

/**
 * Bundle the checkout wallet implementation without rebinding its private dependency
 * versions to the SDK's public dependencies. Disable tsup's automatic externalization so its
 * earlier dependency plugin leaves these decisions to this plugin.
 */
export function createCheckoutExternalsPlugin({ sourceRoot, runtimeDependencies }: CheckoutExternalsOptions): Plugin {
    const sdkSource = canonicalPath(sourceRoot);
    const publicDependencies = new Set(runtimeDependencies);
    const resolving = Symbol("checkout-external-resolution");

    return {
        name: "checkout-externals",
        setup(build) {
            const resolutions = new Map<string, Promise<ResolveResult>>();
            const roots = new Map<string, string | undefined>();
            function resolveImport(specifier: string, options: ResolveOptions) {
                const key = `${options.resolveDir}\0${options.kind}\0${specifier}`;
                let result = resolutions.get(key);
                if (!result) {
                    result = build.resolve(specifier, { ...options, pluginData: resolving });
                    resolutions.set(key, result);
                }
                return result;
            }
            function resolvedRoot(result: ResolveResult) {
                if (result.errors.length || result.external || result.namespace !== "file" || !result.path) {
                    return undefined;
                }
                if (!roots.has(result.path)) {
                    roots.set(result.path, packageRoot(result.path));
                }
                return roots.get(result.path);
            }

            build.onResolve({ filter: /^[^./]/ }, async (args) => {
                if (args.pluginData === resolving) {
                    return;
                }
                const name = packageName(args.path);
                // These contexts and public Crossmint classes must remain consumer singletons.
                if (name === "react" || name === "react-dom" || name.startsWith("@crossmint/")) {
                    return { path: args.path, external: true };
                }
                if (!publicDependencies.has(name)) {
                    return;
                }

                const importer = canonicalPath(args.importer);
                const fromSource = relative(sdkSource, importer);
                if (fromSource !== ".." && !fromSource.startsWith(`..${sep}`) && !isAbsolute(fromSource)) {
                    return { path: args.path, external: true };
                }

                // Share a public chain library only when esbuild resolves the very same
                // package instance. A private zod/mini or older viem must remain bundled.
                const [sdkDependency, importedDependency] = await Promise.all([
                    resolveImport(args.path, { resolveDir: sdkSource, kind: args.kind }),
                    resolveImport(args.path, {
                        resolveDir: args.resolveDir,
                        importer: args.importer,
                        kind: args.kind,
                    }),
                ]);
                const sdkRoot = resolvedRoot(sdkDependency);
                if (sdkRoot && sdkRoot === resolvedRoot(importedDependency)) {
                    return { path: args.path, external: true };
                }
            });
        },
    };
}
