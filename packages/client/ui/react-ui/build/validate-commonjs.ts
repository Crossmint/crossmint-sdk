import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { compileFunction } from "node:vm";

/** Parse every CommonJS output using Node's module wrapper, without executing SDK code. */
export async function validateCommonJs(outDir: string): Promise<void> {
    async function visit(directory: string): Promise<void> {
        const entries = await readdir(directory, { withFileTypes: true });
        entries.sort((left, right) => left.name.localeCompare(right.name));
        for (const entry of entries) {
            const filename = join(directory, entry.name);
            if (entry.isDirectory()) {
                await visit(filename);
            } else if (entry.isFile() && entry.name.endsWith(".cjs")) {
                const source = await readFile(filename, "utf8");
                try {
                    compileFunction(source, ["exports", "require", "module", "__filename", "__dirname"], { filename });
                } catch (error) {
                    const message = error instanceof Error ? error.message.split(/\r?\n/, 1)[0].slice(0, 180) : "Invalid syntax";
                    throw new Error(`CommonJS syntax check failed for ${relative(outDir, filename)}: ${message}`);
                }
            }
        }
    }

    await visit(outDir);
}
