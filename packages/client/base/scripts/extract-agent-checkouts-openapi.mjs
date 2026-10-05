// Copies the agent-checkout operations out of crossbit-main's generated public spec into the
// input `pnpm generate` reads. crossbit-main's controllers own the contract; regenerate after
// they change:
//   pnpm extract:agent-checkouts-openapi <crossbit-main>/apps/crossmint-mintlify-docs/src/api-reference/_open-api/Payments.json
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PATH_PREFIX = "/unstable/agent-checkouts";
// The API client sends these on every request.
const CLIENT_HEADERS = new Set(["x-api-key", "authorization", "x-crossmint-user-id"]);
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), "../src/services/agent-checkouts/openapi.json");

const [source] = process.argv.slice(2);
if (source === undefined) {
    console.error("Usage: extract-agent-checkouts-openapi.mjs <Payments.json>");
    process.exit(1);
}
const spec = JSON.parse(readFileSync(source, "utf8"));

const paths = {};
for (const [path, item] of Object.entries(spec.paths)) {
    if (!path.startsWith(PATH_PREFIX)) {
        continue;
    }
    const operations = {};
    for (const [method, operation] of Object.entries(item)) {
        operations[method] = {
            ...operation,
            // `AgentCheckoutsController-createCheckout-2` -> `createCheckout`
            operationId: operation.operationId.replace(/^\w+Controller-/, "").replace(/-\d+$/, ""),
            parameters: (operation.parameters ?? []).filter(
                (parameter) => !(parameter.in === "header" && CLIENT_HEADERS.has(parameter.name.toLowerCase()))
            ),
        };
    }
    paths[`/api${path}`] = operations;
}
if (Object.keys(paths).length === 0) {
    console.error(`No ${PATH_PREFIX} paths in ${source}`);
    process.exit(1);
}

const schemas = {};
function collectRefs(node) {
    if (Array.isArray(node)) {
        node.forEach(collectRefs);
        return;
    }
    if (node === null || typeof node !== "object") {
        return;
    }
    for (const [key, value] of Object.entries(node)) {
        if (key === "$ref" && typeof value === "string") {
            const name = value.slice(value.lastIndexOf("/") + 1);
            if (!(name in schemas)) {
                schemas[name] = spec.components.schemas[name];
                collectRefs(schemas[name]);
            }
        } else {
            collectRefs(value);
        }
    }
}
collectRefs(paths);

// zod-openapi emits a refined string (a UUID, say) as `{ allOf: [{ pattern }, ...] }`, sometimes
// without `type`; generators read that as `unknown`. A pattern only constrains strings, so fold
// the patterns into one string schema.
function foldPatternAllOf(node) {
    if (Array.isArray(node)) {
        node.forEach(foldPatternAllOf);
        return;
    }
    if (node === null || typeof node !== "object") {
        return;
    }
    const { allOf } = node;
    if (
        (node.type === undefined || node.type === "string") &&
        Array.isArray(allOf) &&
        allOf.every((part) => Object.keys(part).length === 1 && typeof part.pattern === "string")
    ) {
        const patterns = [...new Set(allOf.map((part) => part.pattern))];
        delete node.allOf;
        node.type = "string";
        if (patterns.length === 1) {
            node.pattern = patterns[0];
        } else {
            node.allOf = patterns.map((pattern) => ({ pattern }));
        }
    }
    Object.values(node).forEach(foldPatternAllOf);
}
foldPatternAllOf(paths);
foldPatternAllOf(schemas);

const output = {
    openapi: spec.openapi,
    info: { ...spec.info, title: "Crossmint Agent Checkouts API" },
    paths,
    components: {
        schemas: Object.fromEntries(
            Object.keys(schemas)
                .sort()
                .map((name) => [name, schemas[name]])
        ),
    },
};
writeFileSync(OUTPUT, `${JSON.stringify(output, null, 4)}\n`);
execFileSync("pnpm", ["exec", "biome", "format", "--write", OUTPUT], { stdio: "inherit" });
console.log(`Wrote ${Object.keys(paths).length} paths and ${Object.keys(schemas).length} schemas to ${OUTPUT}`);
