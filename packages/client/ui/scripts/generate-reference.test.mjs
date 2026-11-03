import { strict as assert } from "node:assert";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { generate } from "./generate-reference.mjs";

test("renders forwardRef components and their referenced props alongside function components", () => {
    const directory = mkdtempSync(join(tmpdir(), "sdk-reference-"));
    const apiPath = join(directory, "api.json");
    const examplesPath = join(directory, "examples.json");
    const prop = { name: "jwt", flags: {}, type: { type: "intrinsic", name: "string" } };
    const propsType = { type: "reference", name: "FieldProps", target: 3 };
    writeFileSync(
        apiPath,
        JSON.stringify({
            children: [
                {
                    id: 1,
                    name: "ProtectedField",
                    kind: 32,
                    type: {
                        type: "reference",
                        name: "ForwardRefExoticComponent",
                        typeArguments: [
                            {
                                type: "intersection",
                                types: [
                                    propsType,
                                    {
                                        type: "reference",
                                        name: "RefAttributes",
                                        target: { qualifiedName: "React.RefAttributes" },
                                    },
                                ],
                            },
                        ],
                    },
                },
                { id: 2, name: "OrdinaryField", kind: 64, signatures: [{ parameters: [{ type: propsType }] }] },
                { id: 3, name: "FieldProps", kind: 256, children: [prop] },
                { id: 4, name: "NotAComponent", kind: 32, type: { type: "intrinsic", name: "string" } },
            ],
        })
    );
    writeFileSync(
        examplesPath,
        JSON.stringify({ ProtectedField: { language: "tsx", code: "<ProtectedField jwt={jwt} />" } })
    );
    try {
        generate({
            apiPath,
            examplesPath,
            outDir: directory,
            products: {
                agents: {
                    outdir: "agents",
                    navPrefix: "sdk-reference/agents/react",
                    title: "React SDK",
                    description: "Agent fields",
                    getStartedExamples: {},
                    exports: ["ProtectedField", "OrdinaryField", "NotAComponent"],
                },
            },
        });
        const page = readFileSync(join(directory, "agents/components.mdx"), "utf8");
        assert.match(page, /## ProtectedField/);
        assert.match(page, /<ProtectedField jwt=\{jwt\} \/>/);
        assert.match(page, /## OrdinaryField/);
        assert.equal(page.match(/<ResponseField name="jwt" type="string" required/g)?.length, 2);
        assert.doesNotMatch(page, /## NotAComponent/);
    } finally {
        rmSync(directory, { recursive: true });
    }
});

test("renders a types page with functions, classes, payer methods and literal unions", () => {
    const directory = mkdtempSync(join(tmpdir(), "sdk-reference-"));
    const apiPath = join(directory, "api.json");
    const examplesPath = join(directory, "examples.json");
    const doc = (text) => ({ summary: [{ kind: "text", text }] });
    writeFileSync(
        apiPath,
        JSON.stringify({
            children: [
                {
                    id: 1,
                    name: "STATUSES",
                    kind: 32,
                    type: {
                        type: "typeOperator",
                        operator: "readonly",
                        target: {
                            type: "tuple",
                            elements: [
                                { type: "literal", value: "ready" },
                                { type: "literal", value: "done" },
                            ],
                        },
                    },
                },
                {
                    id: 2,
                    name: "Status",
                    kind: 2097152,
                    comment: doc("| Status | Meaning |\n| --- | --- |\n| `ready` | Ready. |"),
                    type: {
                        type: "indexedAccess",
                        indexType: { type: "intrinsic", name: "number" },
                        objectType: { type: "query", queryType: { type: "reference", target: 1, name: "STATUSES" } },
                    },
                },
                {
                    id: 3,
                    name: "makePayer",
                    kind: 64,
                    signatures: [
                        {
                            comment: doc("Returns a payer."),
                            parameters: [{ name: "wallet", type: { type: "reference", name: "Wallet" } }],
                            type: { type: "reference", name: "Payer", target: 4 },
                        },
                    ],
                },
                {
                    id: 4,
                    name: "Payer",
                    kind: 2097152,
                    comment: doc("Sends the deposit."),
                    type: {
                        type: "reflection",
                        declaration: {
                            children: [
                                {
                                    name: "send",
                                    kind: 2048,
                                    signatures: [
                                        {
                                            comment: doc("Sign and send."),
                                            parameters: [{ name: "tx", type: { type: "intrinsic", name: "string" } }],
                                            type: {
                                                type: "reference",
                                                name: "Promise",
                                                typeArguments: [{ type: "intrinsic", name: "string" }],
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                },
                {
                    id: 5,
                    name: "RejectedError",
                    kind: 128,
                    comment: doc("Thrown on decline."),
                    extendedTypes: [{ type: "reference", name: "Error" }],
                },
            ],
        })
    );
    writeFileSync(examplesPath, JSON.stringify({}));
    try {
        generate({
            apiPath,
            examplesPath,
            outDir: directory,
            products: {
                offramp: {
                    outdir: "offramp",
                    navPrefix: "sdk-reference/offramp/react",
                    title: "React SDK",
                    description: "Offramp",
                    getStartedExamples: {},
                    exports: [],
                    types: ["makePayer", "RejectedError", "Payer", "Status"],
                },
            },
        });
        const page = readFileSync(join(directory, "offramp/types.mdx"), "utf8");
        assert.match(page, /function makePayer\(wallet: Wallet\): Payer/);
        assert.match(page, /class RejectedError extends Error/);
        assert.match(
            page,
            /<ResponseField name="send" type="\(tx: string\) => Promise<string>" required>\n {2}Sign and send\./
        );
        assert.match(page, /type Status =\n {4}\| "ready"\n {4}\| "done"/);
        assert.match(page, /\| `ready` \| Ready\. \|/);
        assert.match(
            readFileSync(join(directory, "offramp/get-started.mdx"), "utf8"),
            /\[Types and Utilities\]\(\/sdk-reference\/offramp\/react\/types\)/
        );
    } finally {
        rmSync(directory, { recursive: true });
    }
});
