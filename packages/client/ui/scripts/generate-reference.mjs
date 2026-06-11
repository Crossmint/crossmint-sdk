#!/usr/bin/env node
/**
 * SDK Reference Docs Generator — Shared Engine
 *
 * Pipeline: TypeDoc (api.json) + examples.json → Mintlify MDX pages
 *
 * Props, methods, and descriptions are auto-extracted from source JSDoc.
 * Expandable sub-properties are auto-resolved from TypeDoc type references
 * where possible. MANUAL_RETURNS and FALLBACK_EXPANDABLE_CHILDREN handle
 * edge cases where TypeDoc can't resolve types (e.g. cross-package generics).
 *
 * This module exports a `generate(config)` function used by platform-specific
 * callers in react-ui/ and react-native/.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";

// =============================================================================
// Shared constants
// =============================================================================

/**
 * Fallback expandable sub-properties for generic cross-package types that
 * TypeDoc can't resolve even with path mappings (e.g. WalletArgsFor<Chain>).
 * The auto-resolver handles most cases; these are only used when it fails.
 */
const WALLET_CREATE_ARGS_CHILDREN = [
    {
        name: "chain",
        type: { type: "reference", name: "Chain" },
        comment: {
            summary: [{ kind: "text", text: 'The blockchain to create the wallet on (e.g. "base-sepolia").' }],
        },
    },
    {
        name: "recovery",
        type: { type: "reference", name: "SignerConfigForChain" },
        comment: {
            summary: [
                {
                    kind: "text",
                    text: 'The recovery signer configuration (e.g. `{ type: "email" }`). Used for wallet recovery and adding new signers.',
                },
            ],
        },
    },
    {
        name: "signers",
        flags: { isOptional: true },
        type: { type: "array", elementType: { type: "reference", name: "SignerConfigForChain" } },
        comment: {
            summary: [
                {
                    kind: "text",
                    text: 'Optional array of operational signers. Defaults to a device signer if omitted (e.g. `[{ type: "device" }]`).',
                },
            ],
        },
    },
    {
        name: "alias",
        flags: { isOptional: true },
        type: { type: "intrinsic", name: "string" },
        comment: { summary: [{ kind: "text", text: "Optional wallet alias." }] },
    },
    {
        name: "plugins",
        flags: { isOptional: true },
        type: { type: "array", elementType: { type: "reference", name: "WalletPlugin" } },
        comment: { summary: [{ kind: "text", text: "Optional array of wallet plugins." }] },
    },
];

const WALLET_GET_ARGS_CHILDREN = [
    {
        name: "chain",
        type: { type: "reference", name: "Chain" },
        comment: {
            summary: [{ kind: "text", text: 'The blockchain of the wallet to retrieve (e.g. "base-sepolia").' }],
        },
    },
    {
        name: "alias",
        flags: { isOptional: true },
        type: { type: "intrinsic", name: "string" },
        comment: { summary: [{ kind: "text", text: "Optional wallet alias to look up." }] },
    },
];

const DEFAULT_EXPANDABLE_CHILDREN = {
    createOnLogin: WALLET_CREATE_ARGS_CHILDREN,
    createWallet: WALLET_CREATE_ARGS_CHILDREN,
    getWallet: WALLET_GET_ARGS_CHILDREN,
};

// =============================================================================
// TypeDoc JSON helpers
// =============================================================================

const KIND = {
    CLASS: 128,
    INTERFACE: 256,
    TYPE_ALIAS: 2097152,
    VARIABLE: 32,
    FUNCTION: 64,
    PROPERTY: 1024,
    METHOD: 2048,
};

/**
 * Auto-classifies exports by React naming convention:
 *   *Provider → providers, use* → hooks, everything else → components
 */
function classifyExports(exportNames) {
    const providers = [];
    const hooks = [];
    const components = [];
    for (const name of exportNames) {
        if (name.endsWith("Provider")) providers.push(name);
        else if (name.startsWith("use")) hooks.push(name);
        else components.push(name);
    }
    return { providers, hooks, components };
}

// =============================================================================
// Type rendering
// =============================================================================

const MAX_TYPE_DEPTH = 3;
const MAX_TYPE_LENGTH = 120;

function renderType(t, depth = 0) {
    if (!t) return "unknown";
    if (depth > MAX_TYPE_DEPTH) return "...";

    let result;
    switch (t.type) {
        case "intrinsic":
            result = t.name;
            break;
        case "literal":
            result = typeof t.value === "string" ? `"${t.value}"` : String(t.value);
            break;
        case "reference":
            if (t.typeArguments && depth < MAX_TYPE_DEPTH) {
                const rendered = `${t.name}<${t.typeArguments.map((a) => renderType(a, depth + 1)).join(", ")}>`;
                result = rendered.length > MAX_TYPE_LENGTH ? t.name : rendered;
            } else {
                result = t.name;
            }
            break;
        case "union": {
            const parts = t.types.map((u) => renderType(u, depth + 1));
            result = parts.join(" | ");
            if (result.length > MAX_TYPE_LENGTH) {
                const kept = [];
                let len = 0;
                for (const p of parts) {
                    if (len + p.length > MAX_TYPE_LENGTH - 10) {
                        kept.push("...");
                        break;
                    }
                    kept.push(p);
                    len += p.length + 3;
                }
                result = kept.join(" | ");
            }
            break;
        }
        case "intersection":
            result = t.types.map((u) => renderType(u, depth + 1)).join(" & ");
            break;
        case "array":
            result = `${renderType(t.elementType, depth + 1)}[]`;
            break;
        case "reflection": {
            const decl = t.declaration;
            if (decl?.signatures?.length) {
                const sig = decl.signatures[0];
                const params = (sig.parameters || [])
                    .map((p) => `${p.name}: ${renderType(p.type, depth + 1)}`)
                    .join(", ");
                result = `(${params}) => ${renderType(sig.type, depth + 1)}`;
            } else if (decl?.children?.length) {
                if (depth >= MAX_TYPE_DEPTH - 1) {
                    result = "object";
                } else {
                    const props = decl.children.map((c) => {
                        const opt = c.flags?.isOptional ? "?" : "";
                        return `${c.name}${opt}: ${renderType(c.type, depth + 1)}`;
                    });
                    const inline = `{ ${props.join("; ")} }`;
                    result = inline.length > MAX_TYPE_LENGTH ? "object" : inline;
                }
            } else {
                result = "object";
            }
            break;
        }
        case "tuple":
            result = `[${t.elements.map((e) => renderType(e, depth + 1)).join(", ")}]`;
            break;
        case "indexedAccess":
            result = `${renderType(t.objectType, depth + 1)}[${renderType(t.indexType, depth + 1)}]`;
            break;
        case "mapped":
            result = "Record<string, any>";
            break;
        case "query":
            result = `typeof ${renderType(t.queryType, depth + 1)}`;
            break;
        case "typeOperator":
            result = `${t.operator} ${renderType(t.target, depth + 1)}`;
            break;
        case "conditional":
            result = renderType(t.trueType, depth + 1);
            break;
        case "templateLiteral":
            result = "string";
            break;
        default:
            result = t.name || "unknown";
    }

    if (result.length > MAX_TYPE_LENGTH * 2) {
        return result.substring(0, MAX_TYPE_LENGTH) + "...";
    }
    return result;
}

function getComment(node) {
    const summary = node?.comment?.summary;
    if (!summary?.length) return "";
    return summary
        .map((s) => s.text)
        .join("")
        .replace(/\n/g, " ")
        .trim();
}

// =============================================================================
// MDX builders
// =============================================================================

function escapeForTable(str) {
    return str.replace(/\|/g, "\\|");
}

function escapeForAttr(str) {
    return str.replace(/"/g, "&quot;");
}

/**
 * Renders fields as Mintlify <ResponseField> components with optional
 * <Expandable> for nested sub-properties.
 *
 * @param {Array} members - array of field objects (from TypeDoc or MANUAL_*)
 * @param {Object} opts
 * @param {boolean} opts.skipChildren - skip the React `children` prop
 * @param {string} opts.expandableTitle - title for nested expandable (default: "properties")
 * @param {boolean} opts.showRequired - show "required" attribute on fields (default: true)
 */
function buildFieldsSection(
    members,
    { skipChildren = false, expandableTitle = "properties", showRequired = true } = {}
) {
    if (!members?.length) return "";
    const L = [];
    for (const m of members) {
        if (skipChildren && m.name === "children") continue;
        const typeStr = escapeForAttr(renderType(m.type));
        const comment = getComment(m);
        const requiredAttr = showRequired && !m.flags?.isOptional ? " required" : "";

        L.push(`<ResponseField name="${m.name}" type="${typeStr}"${requiredAttr}>`);
        if (comment) L.push(`  ${comment}`);

        if (m.children?.length) {
            L.push(`  <Expandable title="${expandableTitle}">`);
            for (const sub of m.children) {
                const subType = escapeForAttr(renderType(sub.type));
                const subComment = getComment(sub);
                const subReq = showRequired && !sub.flags?.isOptional ? " required" : "";
                if (subComment) {
                    L.push(`    <ResponseField name="${sub.name}" type="${subType}"${subReq}>`);
                    L.push(`      ${subComment}`);
                    L.push(`    </ResponseField>`);
                } else {
                    L.push(`    <ResponseField name="${sub.name}" type="${subType}"${subReq} />`);
                }
            }
            L.push(`  </Expandable>`);
        }

        L.push(`</ResponseField>`);
        L.push("");
    }
    return L.join("\n");
}

/**
 * Auto-resolves expandable children from TypeDoc type references.
 * For each member whose type is a reference to a known interface/type-alias
 * with properties, attaches those properties as `children` for rendering
 * as expandable sub-fields.
 *
 * Falls back to the manual `expandableChildren` map for types that
 * TypeDoc can't resolve (e.g. cross-package generics like WalletArgsFor<Chain>).
 */
function attachExpandableChildren(members, expandableChildren, { byId, allExports }) {
    if (!members?.length) return members;
    return members.map((m) => {
        // Already has children (e.g. from inline reflection type) — skip
        if (m.children?.length) return m;

        // Try auto-resolving from TypeDoc type reference
        const resolved = autoResolveChildren(m.type, { byId, allExports });
        if (resolved?.length) {
            return { ...m, children: resolved };
        }

        // Fallback: use manual expandableChildren map (keyed by prop name)
        const manual = expandableChildren[m.name];
        if (manual) {
            return { ...m, children: manual };
        }

        return m;
    });
}

/**
 * Given a TypeDoc type descriptor, attempts to resolve it to a list of
 * child property members. Works for:
 * - Direct references to interfaces/type-aliases with children
 * - Reflection types (inline object types)
 * - Intersection types (merges properties from all branches)
 *
 * Returns null if the type can't be resolved to properties.
 */
function autoResolveChildren(type, { byId, allExports }) {
    if (!type) return null;

    if (type.type === "reflection" && type.declaration?.children?.length) {
        return type.declaration.children;
    }

    if (type.type === "reference" && type.target != null) {
        // Try numeric ID first
        if (typeof type.target === "number") {
            const resolved = byId.get(type.target);
            if (resolved?.children?.length) return resolved.children;
            // Type alias with a nested type (e.g. type Foo = { ... })
            if (resolved?.type?.type === "reflection" && resolved.type.declaration?.children?.length) {
                return resolved.type.declaration.children;
            }
        }

        // Fallback: look up by name in flattened exports
        const name = type.target?.qualifiedName || type.name;
        if (name) {
            const matches = (allExports || []).filter((c) => c.name === name && (c.kind === 256 || c.kind === 2097152));
            for (const match of matches) {
                if (match.children?.length) return match.children;
                if (match.type?.type === "reflection" && match.type.declaration?.children?.length) {
                    return match.type.declaration.children;
                }
            }
        }
    }

    if (type.type === "intersection" && type.types?.length) {
        const merged = [];
        for (const t of type.types) {
            const children = autoResolveChildren(t, { byId, allExports });
            if (children) merged.push(...children);
        }
        if (!merged.length) return null;
        const unique = new Map();
        for (const c of merged) {
            if (!unique.has(c.name)) unique.set(c.name, c);
        }
        return [...unique.values()];
    }

    return null;
}

// =============================================================================
// Main generate function
// =============================================================================

/**
 * Generates Mintlify MDX reference docs from TypeDoc JSON + examples.
 *
 * @param {Object} config
 * @param {Object} config.products - PRODUCTS config object (keyed by product name)
 * @param {Object} [config.manualReturns={}] - hook name → manual return members
 * @param {Object} [config.expandableChildren] - prop name → expandable sub-props
 * @param {string} [config.apiPath="api.json"] - path to api.json
 * @param {string} [config.examplesPath="examples.json"] - path to examples.json
 * @param {string} [config.outDir="docs"] - output directory
 * @param {string|null} [config.productFilter=null] - optional --product filter
 */
export function generate(config) {
    const {
        products,
        manualReturns = {},
        expandableChildren = DEFAULT_EXPANDABLE_CHILDREN,
        apiPath = "api.json",
        examplesPath = "examples.json",
        outDir: baseOutDir = "docs",
        productFilter = null,
    } = config;

    const API_PATH = resolve(apiPath);
    const EXAMPLES_PATH = resolve(examplesPath);
    const BASE_OUT_DIR = resolve(baseOutDir);

    // =========================================================================
    // Load data
    // =========================================================================
    const api = JSON.parse(readFileSync(API_PATH, "utf-8"));
    const examples = JSON.parse(readFileSync(EXAMPLES_PATH, "utf-8"));

    // =========================================================================
    // TypeDoc JSON helpers (scoped to this api.json)
    // =========================================================================

    // When multiple entry points are used, TypeDoc wraps exports in module
    // nodes (kind: 2). Flatten all top-level modules so findByName can locate
    // exports regardless of module structure.
    const allExports = [];
    for (const child of api.children || []) {
        if (child.kind === 2 && child.children?.length) {
            allExports.push(...child.children);
        } else {
            allExports.push(child);
        }
    }

    const byId = new Map();
    (function index(node) {
        if (node.id != null) byId.set(node.id, node);
        node.children?.forEach(index);
    })(api);

    function findByName(name, kind) {
        return allExports.find((c) => c.name === name && (kind == null || c.kind === kind));
    }

    // =========================================================================
    // Extraction helpers
    // =========================================================================

    function renderExample(name) {
        const ex = examples[name];
        if (!ex) return "";
        const note = ex.note ? `\n> **Note:** ${ex.note}\n` : "";
        return `\n\`\`\`${ex.language}\n${ex.code}\n\`\`\`\n${note}`;
    }

    function extractProps(node) {
        const sig = node?.signatures?.[0];
        if (!sig?.parameters?.length) return [];
        const param = sig.parameters[0];
        const type = param.type;
        let allProps = [];
        function collectProps(t) {
            if (!t) return;
            if (t.type === "reflection" && t.declaration?.children) {
                allProps.push(...t.declaration.children);
            } else if (t.type === "intersection") {
                t.types.forEach(collectProps);
            } else if (t.type === "union") {
                // For union types (A | B), merge all unique props from all branches.
                // Props typed as `never` (serialized as "undefined") are discriminators — skip them.
                // Props present in all branches keep their required status; others become optional.
                const isNeverType = (prop) =>
                    prop.type?.type === "intrinsic" && (prop.type.name === "undefined" || prop.type.name === "never");

                const branchProps = [];
                for (const ut of t.types) {
                    const branch = [];
                    const saved = allProps;
                    allProps = branch;
                    collectProps(ut);
                    allProps = saved;
                    branchProps.push(branch.filter((p) => !isNeverType(p)));
                }
                const seen = new Map();
                const branchCount = branchProps.length;
                for (const branch of branchProps) {
                    for (const prop of branch) {
                        if (!seen.has(prop.name)) {
                            seen.set(prop.name, { prop, count: 1 });
                        } else {
                            seen.get(prop.name).count++;
                        }
                    }
                }
                // Props not in all branches become optional
                for (const { prop, count } of seen.values()) {
                    if (count < branchCount && !prop.flags?.isOptional) {
                        allProps.push({ ...prop, flags: { ...prop.flags, isOptional: true } });
                    } else {
                        allProps.push(prop);
                    }
                }
            } else if (t.type === "reference" && t.target != null) {
                const resolved = typeof t.target === "number" ? byId.get(t.target) : null;
                if (resolved?.children) {
                    allProps.push(...resolved.children);
                    return;
                }
                // If resolved is a type alias, check its underlying type
                if (resolved?.type) {
                    collectProps(resolved.type);
                    return;
                }
                // Fallback: target is an object descriptor or unresolved.
                // Look up by qualifiedName/name; prefer the variant that has children.
                const name = t.target?.qualifiedName || t.name;
                if (name) {
                    const matches = allExports.filter(
                        (c) => c.name === name && (c.kind === KIND.INTERFACE || c.kind === KIND.TYPE_ALIAS)
                    );
                    const withChildren = matches.find((m) => m.children?.length);
                    if (withChildren) {
                        allProps.push(...withChildren.children);
                    } else {
                        // Try resolving the type alias's underlying type
                        const withType = matches.find((m) => m.type);
                        if (withType) collectProps(withType.type);
                    }
                }
            }
        }
        collectProps(type);
        // Deduplicate by name (keep first occurrence)
        const unique = new Map();
        for (const p of allProps) {
            if (!unique.has(p.name)) unique.set(p.name, p);
        }
        return [...unique.values()];
    }

    function extractReturnMembers(node) {
        const sig = node?.signatures?.[0];
        const retType = sig?.type;
        if (!retType) return [];
        if (retType.type === "reference") {
            if (typeof retType.target === "number") {
                const resolved = byId.get(retType.target);
                if (resolved?.children) return resolved.children;
            }
            // Fallback: target is an object descriptor (cross-package or unresolved local).
            // Look up the type by name; prefer the variant that has children.
            const name = retType.target?.qualifiedName || retType.name;
            if (name) {
                const matches = allExports.filter(
                    (c) => c.name === name && (c.kind === KIND.INTERFACE || c.kind === KIND.TYPE_ALIAS)
                );
                const withChildren = matches.find((m) => m.children?.length);
                if (withChildren) return withChildren.children;
            }
        }
        if (retType.type === "reflection" && retType.declaration?.children) {
            return retType.declaration.children;
        }
        return [];
    }

    /**
     * Extracts wallet methods from api.json for the given class config.
     * Returns { methods, chainSpecific } matching the format used by buildHooks().
     */
    function extractWalletMethodsFromApi(wmConfig) {
        const { baseClass, chainClasses, docsBasePath, skip = [] } = wmConfig;

        const baseNode = findByName(baseClass, KIND.CLASS);
        if (!baseNode) {
            console.warn(`  Warning: Wallet base class "${baseClass}" not found in api.json`);
            return { methods: [], chainSpecific: [] };
        }

        const baseMethods = (baseNode.children || [])
            .filter((c) => c.kind === KIND.METHOD && !skip.includes(c.name))
            .map((c) => ({
                name: `wallet.${c.name}()`,
                link: `${docsBasePath}/${baseClass}#${c.name.toLowerCase().replace(/_/g, "-")}`,
                description: getComment(c) || getComment(c.signatures?.[0]) || "",
            }));

        const baseMethodNames = new Set(
            (baseNode.children || []).filter((c) => c.kind === KIND.METHOD).map((c) => c.name)
        );

        const chainSpecific = [];
        for (const className of chainClasses) {
            const classNode = findByName(className, KIND.CLASS);
            if (!classNode) continue;

            const uniqueMethods = (classNode.children || [])
                .filter((c) => c.kind === KIND.METHOD && !baseMethodNames.has(c.name) && !skip.includes(c.name))
                .map((c) => `\`${c.name}()\``)
                .join(", ");

            if (uniqueMethods) {
                chainSpecific.push({
                    name: className,
                    link: `${docsBasePath}/${className}`,
                    methods: uniqueMethods,
                });
            }
        }

        return { methods: baseMethods, chainSpecific };
    }

    // =========================================================================
    // Page generators
    // =========================================================================

    function emitBanner(emit, product, pageName) {
        if (!product.versionBanner) return;
        emit(product.versionBanner.replaceAll("{page}", pageName));
        emit("");
    }

    function buildGetStarted(product) {
        const L = [];
        const emit = (...a) => L.push(a.join(""));

        emit("---");
        emit(`title: Get Started`);
        emit(`description: Installation and setup for the ${product.description}`);
        emit("---");
        emit("");
        emitBanner(emit, product, "get-started");

        // Version shield badge
        if (product.npmUrl && product.packageName) {
            emit(
                `### Latest ${product.title} version - <a href="${product.npmUrl}" target="_blank" rel="noopener" style={{display: "inline-block", verticalAlign: "middle", textDecoration: "none", borderBottom: "none"}}><img src="https://img.shields.io/npm/v/${product.packageName}" alt="npm" style={{display: "inline-block", verticalAlign: "middle", margin: 0}} noZoom /></a>`
            );
            emit("");
        }

        emit(product.intro);
        emit("");

        emit("## Installation");
        emit("");
        if (product.installSnippet) {
            emit(`<Snippet file="${product.installSnippet}" />`);
        } else {
            emit(renderExample("installation"));
        }
        emit("");

        emit("## Provider Setup");
        emit("");
        emit("Wrap your application with the required providers:");
        emit(renderExample(product.getStartedExamples.setup));
        emit("");

        emit("## Quick Example");
        emit("");
        emit(
            product.getStartedExamples.quickExampleIntro ||
                "Once providers are set up, use hooks to interact with the SDK:"
        );
        emit(renderExample(product.getStartedExamples.quickExample));
        emit("");

        emit("## Next Steps");
        emit("");
        const { components: comps } = classifyExports(product.exports);
        emit(`- [Providers](/${product.navPrefix}/providers) — Configure providers and their options`);
        emit(`- [Hooks](/${product.navPrefix}/hooks) — Access SDK state via React hooks`);
        if (comps.length) {
            emit(`- [Components](/${product.navPrefix}/components) — Drop-in UI components`);
        }
        if (product.walletMethods?.enabled) {
            emit(
                `- [Wallets SDK Reference](/sdk-reference/wallets/typescript/classes/Wallet) — Complete wallet method documentation`
            );
        }

        return L.join("\n");
    }

    function buildProviders(product) {
        const L = [];
        const emit = (...a) => L.push(a.join(""));

        emit("---");
        emit(`title: Providers`);
        emit(`description: ${product.title.replace(/ SDK$/, "")} context providers for ${product.description}`);
        emit("---");
        emit("");
        emitBanner(emit, product, "providers");

        const { providers } = classifyExports(product.exports);

        // Provider order list
        providers.forEach((name, i) => {
            const desc = product.descriptions?.[name] || getComment(findByName(name, KIND.FUNCTION)) || "";
            emit(`${i + 1}. \`${name}\` — ${desc}`);
        });
        emit("");

        for (const name of providers) {
            const node = findByName(name, KIND.FUNCTION);
            if (!node) continue;

            emit("---");
            emit("");
            emit(`## ${name}`);
            emit("");

            const comment = getComment(node) || getComment(node?.signatures?.[0]);
            if (comment) {
                emit(comment);
                emit("");
            }

            let props = extractProps(node);
            props = attachExpandableChildren(props, expandableChildren, { byId, allExports });
            const fields = buildFieldsSection(props, { skipChildren: true });
            if (fields) {
                emit("### Props");
                emit("");
                emit(fields);
            }

            const ex = renderExample(name);
            if (ex) {
                emit("### Usage");
                emit(ex);
                emit("");
            }
        }

        return L.join("\n");
    }

    function buildHooks(product) {
        const L = [];
        const emit = (...a) => L.push(a.join(""));

        emit("---");
        emit(`title: Hooks`);
        emit(`description: ${product.title.replace(/ SDK$/, "")} hooks for ${product.description}`);
        emit("---");
        emit("");
        emitBanner(emit, product, "hooks");

        const { hooks } = classifyExports(product.exports);

        for (const name of hooks) {
            const aliases = product.aliases?.[name] || [];

            let node = findByName(name, KIND.FUNCTION);
            if (!node) node = findByName(name, KIND.VARIABLE);
            if (!node) continue;

            emit("---");
            emit("");
            emit(`## ${name}()`);
            emit("");

            if (aliases.length) {
                emit(`> Also exported as ${aliases.map((a) => `\`${a}()\``).join(", ")}.`);
                emit("");
            }

            const comment = getComment(node) || getComment(node?.signatures?.[0]);
            if (comment) {
                emit(comment);
                emit("");
            }

            // Manual returns take priority — they exist precisely because
            // TypeDoc can't resolve the cross-package types
            let members = manualReturns[name] || extractReturnMembers(node);
            members = attachExpandableChildren(members, expandableChildren, { byId, allExports });
            const fields = buildFieldsSection(members, { expandableTitle: "parameters", showRequired: false });
            if (fields) {
                emit("### Returns");
                emit("");
                emit(fields);
            }

            const ex = renderExample(name);
            if (ex) {
                emit("### Usage");
                emit(ex);
                emit("");
            }
        }

        // Wallet methods section (if enabled for this product)
        if (product.walletMethods?.enabled) {
            const { methods, chainSpecific } = extractWalletMethodsFromApi(product.walletMethods);

            emit("---");
            emit("");
            emit("## Wallet Methods");
            emit("");
            emit(product.walletMethods.description);
            emit("");

            if (methods.length) {
                emit("| Method | Description |");
                emit("| --- | --- |");
                for (const m of methods) {
                    emit(`| [\`${m.name}\`](${m.link}) | ${escapeForTable(m.description)} |`);
                }
                emit("");
            }

            if (chainSpecific.length) {
                emit("**Chain-specific:**");
                emit("");
                for (const c of chainSpecific) {
                    emit(`- [\`${c.name}\`](${c.link}) — ${c.methods}`);
                }
                emit("");
            }
        }

        return L.join("\n");
    }

    function buildComponents(product) {
        const L = [];
        const emit = (...a) => L.push(a.join(""));

        emit("---");
        emit(`title: Components`);
        emit(`description: ${product.title.replace(/ SDK$/, "")} components for ${product.description}`);
        emit("---");
        emit("");

        const { components } = classifyExports(product.exports);

        for (const name of components) {
            const node = findByName(name, KIND.FUNCTION);
            if (!node) continue;

            emit("---");
            emit("");
            emit(`## ${name}`);
            emit("");

            const comment = getComment(node) || getComment(node?.signatures?.[0]);
            if (comment) {
                emit(comment);
                emit("");
            }

            let props = extractProps(node);
            props = attachExpandableChildren(props, expandableChildren, { byId, allExports });
            const fields = buildFieldsSection(props, { skipChildren: true });
            if (fields) {
                emit("### Props");
                emit("");
                emit(fields);
            }

            const ex = renderExample(name);
            if (ex) {
                emit("### Usage");
                emit(ex);
                emit("");
            }
        }

        return L.join("\n");
    }

    // =========================================================================
    // Generate pages for each product
    // =========================================================================

    const productsToGenerate = productFilter ? { [productFilter]: products[productFilter] } : products;

    if (productFilter && !products[productFilter]) {
        console.error(`Unknown product: "${productFilter}". Available: ${Object.keys(products).join(", ")}`);
        process.exit(1);
    }

    const allNavigation = [];

    for (const [productName, product] of Object.entries(productsToGenerate)) {
        const outDir = join(BASE_OUT_DIR, product.outdir);
        mkdirSync(outDir, { recursive: true });

        const pages = [
            { file: "get-started.mdx", content: buildGetStarted(product) },
            { file: "providers.mdx", content: buildProviders(product) },
            { file: "hooks.mdx", content: buildHooks(product) },
        ];

        // Only add components page if there are components
        const { components: productComponents } = classifyExports(product.exports);
        if (productComponents.length) {
            pages.push({ file: "components.mdx", content: buildComponents(product) });
        }

        console.log(`\n[${productName}]`);
        for (const page of pages) {
            const path = join(outDir, page.file);
            writeFileSync(path, page.content, "utf-8");
            const lineCount = page.content.split("\n").length;
            console.log(`  ${page.file} (${lineCount} lines)`);
        }

        allNavigation.push({
            group: product.title,
            pages: pages.map((p) => `${product.navPrefix}/${p.file.replace(".mdx", "")}`),
        });
    }

    // =========================================================================
    // Validate examples coverage
    // =========================================================================

    const validationWarnings = [];

    for (const [productName, product] of Object.entries(productsToGenerate)) {
        const neededExamples = new Set();

        // Only check installation example if not using a snippet
        if (!product.installSnippet) neededExamples.add("installation");

        // All exports need examples
        for (const name of product.exports) neededExamples.add(name);

        // Get-started example keys
        if (product.getStartedExamples) {
            const { setup, quickExample } = product.getStartedExamples;
            if (setup) neededExamples.add(setup);
            if (quickExample) neededExamples.add(quickExample);
        }

        for (const name of neededExamples) {
            if (!examples[name]) {
                validationWarnings.push(`[${productName}] Missing example in examples.json for: "${name}"`);
            }
        }

        // Wallet methods: warn if any extracted method has no description
        if (product.walletMethods?.enabled) {
            const { baseClass, skip = [] } = product.walletMethods;
            const baseNode = findByName(baseClass, KIND.CLASS);
            if (baseNode) {
                const methods = (baseNode.children || []).filter(
                    (c) => c.kind === KIND.METHOD && !skip.includes(c.name)
                );
                for (const m of methods) {
                    const hasComment = getComment(m) || getComment(m.signatures?.[0]);
                    if (!hasComment) {
                        validationWarnings.push(`[${productName}] Wallet method "${m.name}" has no JSDoc comment`);
                    }
                }
            }
        }
    }

    if (validationWarnings.length) {
        console.warn(`\nValidation warnings (${validationWarnings.length}):`);
        validationWarnings.forEach((w) => console.warn(`  ⚠ ${w}`));
    }

    // =========================================================================
    // Output Mintlify navigation JSON
    // =========================================================================
    console.log("\nMintlify navigation (paste into mint.json):");
    console.log(JSON.stringify(allNavigation.length === 1 ? allNavigation[0] : allNavigation, null, 2));
    console.log(`\nDone.`);
}

/**
 * Parses standard CLI flags: --api, --examples, --outdir, --product
 * Returns an object suitable for spreading into generate() config.
 */
export function parseCLIFlags() {
    const args = process.argv.slice(2);
    function flag(name, fallback) {
        const idx = args.indexOf(`--${name}`);
        return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
    }
    return {
        apiPath: flag("api", "api.json"),
        examplesPath: flag("examples", "examples.json"),
        outDir: flag("outdir", "docs"),
        productFilter: flag("product", null),
    };
}
