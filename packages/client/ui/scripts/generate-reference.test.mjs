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
