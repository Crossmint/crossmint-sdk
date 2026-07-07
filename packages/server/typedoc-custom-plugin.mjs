import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MarkdownPageEvent } from "typedoc-plugin-markdown";

const pkg = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "package.json"), "utf8"));

// README.mdx is renamed to overview.mdx in the workflow; its typedoc-derived
// title is the package name, which collides with reference.mdx in nav. Give
// the overview page a distinct, human-friendly title here.
const TITLE_OVERRIDES = {
    "README.mdx": "Getting Started",
    "globals.mdx": "Reference",
};

const NPM_BADGE = `### Latest Node.js SDK version - <a href="https://www.npmjs.com/package/${pkg.name}" target="_blank" rel="noopener" style={{display: "inline-block", verticalAlign: "middle", textDecoration: "none", borderBottom: "none"}}><img src="https://img.shields.io/npm/v/${pkg.name}" alt="npm" style={{display: "inline-block", verticalAlign: "middle", margin: 0}} noZoom /></a>`;

export function load(app) {
    app.renderer.postRenderAsyncJobs.push(async (renderer) => {
        const navigation = renderer.navigation;

        const resultArray = navigation.map((item) => ({
            group: item.title,
            pages: item.children.map((child) => `sdk-reference/auth/typescript/${child.path.replace(".mdx", "")}`),
        }));

        // simply output to console, we then manually copy/paste into docs.json in Mintlify
        console.log(JSON.stringify(resultArray));
    });

    // this adds the title to top of every mdx file as Mintlify expects
    app.renderer.on(MarkdownPageEvent.BEGIN, (page) => {
        page.frontmatter = {
            title: TITLE_OVERRIDES[page.url] ?? page.model?.name,
            ...page.frontmatter,
        };
    });

    app.renderer.on(MarkdownPageEvent.END, (page) => {
        // remove .mdx from links so it works with mintlify
        page.contents = page.contents.replace(/\.mdx/g, "");

        // add "./" to bare relative links (so Mintlify keeps them in-tab) — leave
        // absolute paths (/...), parent-relative (../), and full URLs alone.
        page.contents = page.contents.replace(/\]\((?!http|\/|\.{2}\/)/g, "](./");

        // Strip angle brackets from SCREAMING_SNAKE_CASE placeholders in quoted
        // strings, e.g. "<YOUR_API_KEY>" -> "YOUR_API_KEY" (Mintlify style guide).
        page.contents = page.contents.replace(/"<([A-Z][A-Z0-9_]+)>"/g, '"$1"');

        // For the overview (README) page: strip the H1 heading (already covered by
        // the frontmatter title) and insert the npm version badge.
        if (page.url === "README.mdx") {
            page.contents = page.contents.replace(/^# [^\n]+\n\n?/m, "");
            const before = page.contents;
            page.contents = page.contents.replace(
                /This SDK provides/,
                `${NPM_BADGE}\n\nThe Crossmint server SDK (\`${pkg.name}\`) provides`
            );
            if (page.contents === before) {
                console.warn(
                    "[typedoc-custom-plugin] npm badge insertion failed — README description may have changed"
                );
            }
        }
    });
}
