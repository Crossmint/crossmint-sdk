#!/usr/bin/env node
/**
 * SDK Reference Docs Generator (React Native)
 *
 * Pipeline: TypeDoc (api.json) + examples.json → Mintlify MDX pages
 *
 * Props, methods, and descriptions are auto-extracted from source JSDoc.
 * MANUAL_RETURNS and EXPANDABLE_CHILDREN are the only hardcoded sections —
 * needed because TypeDoc can't resolve types across packages in our monorepo.
 *
 * Run: pnpm generate:docs
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";

// =============================================================================
// PRODUCT MAPPING CONFIG
//
// Maps each product to the exports it needs. Adding a new product is just
// adding a new entry here — no other script changes required.
// =============================================================================

const PRODUCTS = {
    wallets: {
        outdir: "wallets",
        navPrefix: "sdk-reference/wallets/react-native",
        title: "React Native SDK",
        description: "React Native SDK reference for Crossmint wallets",
        packageName: "@crossmint/client-sdk-react-native-ui",
        npmUrl: "https://www.npmjs.com/package/@crossmint/client-sdk-react-native-ui",
        installSnippet: null,
        intro: "The Crossmint React Native SDK (`@crossmint/client-sdk-react-native-ui`) provides React Native components and hooks for integrating Crossmint wallets into your mobile application.",
        // Auto-classified: *Provider → providers page, use* → hooks page, rest → components page
        exports: [
            "CrossmintProvider",
            "CrossmintWalletProvider",
            "useWallet",
            "useWalletEmailSigner",
            "ExportPrivateKeyButton",
        ],
        // Short descriptions for the provider summary list (TypeDoc rarely has these)
        descriptions: {
            CrossmintProvider: "SDK initialization (required for all Crossmint features)",
            CrossmintWalletProvider: "Wallet creation and management",
        },
        walletMethods: {
            enabled: true,
            description:
                "The `wallet` instance returned by `useWallet()` provides methods for token transfers, balances, signing, and more.\n\nSince the React Native SDK wraps the Wallets SDK, see the **[Wallets SDK Reference](/sdk-reference/wallets/classes/Wallet)** for complete documentation.",
            baseClass: "Wallet",
            chainClasses: ["EVMWallet", "SolanaWallet", "StellarWallet"],
            docsBasePath: "/sdk-reference/wallets/classes",
            skip: ["approve", "approveTransaction", "experimental_apiClient", "from"],
        },
        getStartedExamples: {
            setup: "rnWalletProviderSetup",
            quickExample: "rnWalletQuickExample",
            quickExampleIntro: "Once providers are set up, use hooks to access wallet state:",
        },
    },
};

// =============================================================================
// CLI args
// =============================================================================
const args = process.argv.slice(2);
function flag(name, fallback) {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const API_PATH = resolve(flag("api", "api.json"));
const EXAMPLES_PATH = resolve(flag("examples", "examples.json"));
const BASE_OUT_DIR = resolve(flag("outdir", "docs"));
const PRODUCT_FILTER = flag("product", null);

// =============================================================================
// Load data
// =============================================================================
const api = JSON.parse(readFileSync(API_PATH, "utf-8"));
const examples = JSON.parse(readFileSync(EXAMPLES_PATH, "utf-8"));

// =============================================================================
// TypeDoc JSON helpers
// =============================================================================

const byId = new Map();
(function index(node) {
    if (node.id != null) byId.set(node.id, node);
    node.children?.forEach(index);
})(api);

function findByName(name, kind) {
    return api.children.find((c) => c.name === name && (kind == null || c.kind === kind));
}

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
                L.push(`    <ResponseField name="${sub.name}" type="${subType}"${subReq}>`);
                if (subComment) L.push(`      ${subComment}`);
                L.push(`    </ResponseField>`);
            }
            L.push(`  </Expandable>`);
        }

        L.push(`</ResponseField>`);
        L.push("");
    }
    return L.join("\n");
}

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
        } else if (t.type === "reference" && t.target != null) {
            const resolved = typeof t.target === "number" ? byId.get(t.target) : null;
            if (resolved?.children) {
                allProps.push(...resolved.children);
            }
            if (!resolved && t.name) {
                const byName = api.children.find(
                    (c) => c.name === t.name && (c.kind === KIND.INTERFACE || c.kind === KIND.TYPE_ALIAS)
                );
                if (byName?.children) {
                    allProps.push(...byName.children);
                }
            }
        }
    }
    collectProps(type);
    return allProps;
}

function extractReturnMembers(node) {
    const sig = node?.signatures?.[0];
    const retType = sig?.type;
    if (!retType) return [];
    if (retType.type === "reference" && typeof retType.target === "number") {
        const resolved = byId.get(retType.target);
        return resolved?.children || [];
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
function extractWalletMethodsFromApi(config) {
    const { baseClass, chainClasses, docsBasePath, skip = [] } = config;

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

    const baseMethodNames = new Set((baseNode.children || []).filter((c) => c.kind === KIND.METHOD).map((c) => c.name));

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

/**
 * Expandable sub-properties for props/returns that reference cross-package types
 * TypeDoc can't inline. Keyed by the property name within a component/hook.
 *
 * createOnLogin and getOrCreateWallet share the same WalletArgsFor<Chain> shape.
 */
const WALLET_ARGS_CHILDREN = [
    {
        name: "chain",
        type: { type: "reference", name: "Chain" },
        comment: {
            summary: [{ kind: "text", text: 'The blockchain to create the wallet on (e.g. "base-sepolia").' }],
        },
    },
    {
        name: "signer",
        type: { type: "reference", name: "SignerConfigForChain" },
        comment: { summary: [{ kind: "text", text: 'The signer configuration (e.g. `{ type: "email" }`).' }] },
    },
    {
        name: "owner",
        flags: { isOptional: true },
        type: { type: "intrinsic", name: "string" },
        comment: { summary: [{ kind: "text", text: "Optional owner identifier." }] },
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
    {
        name: "delegatedSigners",
        flags: { isOptional: true },
        type: { type: "array", elementType: { type: "reference", name: "DelegatedSigner" } },
        comment: { summary: [{ kind: "text", text: "Optional array of delegated signers." }] },
    },
];

const EXPANDABLE_CHILDREN = {
    createOnLogin: WALLET_ARGS_CHILDREN,
    getOrCreateWallet: WALLET_ARGS_CHILDREN,
};

/**
 * Manual return types for hooks whose return type TypeDoc can't resolve
 * (cross-package references). Only needed when extractReturnMembers() fails.
 */
const MANUAL_RETURNS = {
    useWallet: [
        {
            name: "wallet",
            type: {
                type: "union",
                types: [
                    { type: "reference", name: "Wallet" },
                    { type: "intrinsic", name: "undefined" },
                ],
            },
            comment: {
                summary: [{ kind: "text", text: "The current wallet instance, or undefined if no wallet is loaded." }],
            },
        },
        {
            name: "status",
            type: { type: "reference", name: "WalletStatus" },
            comment: {
                summary: [
                    {
                        kind: "text",
                        text: "Current wallet status. Options: `not-loaded` | `in-progress` | `loaded` | `error`.",
                    },
                ],
            },
        },
        {
            name: "getOrCreateWallet",
            type: {
                type: "reflection",
                declaration: {
                    signatures: [
                        {
                            parameters: [{ name: "args", type: { type: "reference", name: "WalletArgsFor<Chain>" } }],
                            type: {
                                type: "reference",
                                name: "Promise",
                                typeArguments: [
                                    {
                                        type: "union",
                                        types: [
                                            { type: "reference", name: "Wallet" },
                                            { type: "intrinsic", name: "undefined" },
                                        ],
                                    },
                                ],
                            },
                        },
                    ],
                },
            },
            comment: { summary: [{ kind: "text", text: "Creates a new wallet or retrieves an existing one." }] },
        },
    ],
    useWalletEmailSigner: [
        {
            name: "needsAuth",
            type: { type: "intrinsic", name: "boolean" },
            comment: {
                summary: [
                    {
                        kind: "text",
                        text: "Whether the email signer currently requires authentication (OTP verification).",
                    },
                ],
            },
        },
        {
            name: "sendEmailWithOtp",
            type: {
                type: "reflection",
                declaration: {
                    signatures: [
                        {
                            parameters: [],
                            type: {
                                type: "reference",
                                name: "Promise",
                                typeArguments: [{ type: "intrinsic", name: "void" }],
                            },
                        },
                    ],
                },
            },
            comment: {
                summary: [{ kind: "text", text: "Sends a one-time password to the user's email address." }],
            },
        },
        {
            name: "verifyOtp",
            type: {
                type: "reflection",
                declaration: {
                    signatures: [
                        {
                            parameters: [{ name: "otp", type: { type: "intrinsic", name: "string" } }],
                            type: {
                                type: "reference",
                                name: "Promise",
                                typeArguments: [{ type: "intrinsic", name: "void" }],
                            },
                        },
                    ],
                },
            },
            comment: {
                summary: [{ kind: "text", text: "Verifies the one-time password entered by the user." }],
            },
        },
        {
            name: "reject",
            type: {
                type: "reflection",
                declaration: {
                    signatures: [
                        {
                            parameters: [{ name: "error", type: { type: "reference", name: "Error" } }],
                            type: { type: "intrinsic", name: "void" },
                        },
                    ],
                },
            },
            comment: {
                summary: [{ kind: "text", text: "Rejects the current authentication request with an error." }],
            },
        },
    ],
};

// =============================================================================
// Page generators (product-agnostic)
// =============================================================================

function buildGetStarted(product) {
    const L = [];
    const emit = (...a) => L.push(a.join(""));

    emit("---");
    emit(`title: Get Started`);
    emit(`description: Installation and setup for the ${product.description}`);
    emit("---");
    emit("");

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
        product.getStartedExamples.quickExampleIntro || "Once providers are set up, use hooks to interact with the SDK:"
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
        emit(`- [Wallets SDK Reference](/sdk-reference/wallets/classes/Wallet) — Complete wallet method documentation`);
    }

    return L.join("\n");
}

function buildProviders(product) {
    const L = [];
    const emit = (...a) => L.push(a.join(""));

    emit("---");
    emit(`title: Providers`);
    emit(`description: React Native context providers for ${product.description}`);
    emit("---");
    emit("");

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
        // Attach expandable children for cross-package reference types
        props = attachExpandableChildren(props);
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

/**
 * Attaches EXPANDABLE_CHILDREN to props/return members whose names
 * have a matching entry. This enriches cross-package reference types
 * with expandable sub-property documentation.
 */
function attachExpandableChildren(members) {
    if (!members?.length) return members;
    return members.map((m) => {
        const children = EXPANDABLE_CHILDREN[m.name];
        if (children && !m.children?.length) {
            return { ...m, children };
        }
        return m;
    });
}

function buildHooks(product) {
    const L = [];
    const emit = (...a) => L.push(a.join(""));

    emit("---");
    emit(`title: Hooks`);
    emit(`description: React Native hooks for ${product.description}`);
    emit("---");
    emit("");

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

        let members = MANUAL_RETURNS[name] || extractReturnMembers(node);
        members = attachExpandableChildren(members);
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
    emit(`description: React Native components for ${product.description}`);
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
        props = attachExpandableChildren(props);
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

// =============================================================================
// Generate pages for each product
// =============================================================================

const productsToGenerate = PRODUCT_FILTER ? { [PRODUCT_FILTER]: PRODUCTS[PRODUCT_FILTER] } : PRODUCTS;

if (PRODUCT_FILTER && !PRODUCTS[PRODUCT_FILTER]) {
    console.error(`Unknown product: "${PRODUCT_FILTER}". Available: ${Object.keys(PRODUCTS).join(", ")}`);
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

// =============================================================================
// Validate examples coverage
// =============================================================================

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
            const methods = (baseNode.children || []).filter((c) => c.kind === KIND.METHOD && !skip.includes(c.name));
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

// =============================================================================
// Output Mintlify navigation JSON
// =============================================================================
console.log("\nMintlify navigation (paste into mint.json):");
console.log(JSON.stringify(allNavigation.length === 1 ? allNavigation[0] : allNavigation, null, 2));
console.log(`\nDone.`);
