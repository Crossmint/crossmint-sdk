import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MarkdownPageEvent } from "typedoc-plugin-markdown";

const pkg = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), "package.json"), "utf8"),
);
const CURRENT_MAJOR_VERSION = Number.parseInt(pkg.version.split(".")[0], 10);
const PREVIOUS_MAJOR_VERSION = CURRENT_MAJOR_VERSION - 1;

const VERSION_BANNER = `<Note>
**This page has been updated for Wallets SDK V${CURRENT_MAJOR_VERSION}.** If you are using the previous version,
see the [previous version docs](/wallets/v${PREVIOUS_MAJOR_VERSION}/overview) or the [V${CURRENT_MAJOR_VERSION} migration guide](/wallets/guides/migrate-to-v${CURRENT_MAJOR_VERSION}).
</Note>`;

// README.mdx is renamed to overview.mdx in the workflow; its typedoc-derived
// title is the package name, which collides with reference.mdx in nav. Give
// the overview page a distinct, human-friendly title here.
const TITLE_OVERRIDES = {
    "README.mdx": "Getting Started",
};

export function load(app) {
    app.renderer.postRenderAsyncJobs.push(async (renderer) => {
        const navigation = renderer.navigation;

        // sort the Error classes to the end of the list
        const classesIndex = navigation.findIndex((item) => item.title === "Classes");
        if (classesIndex !== -1) {
            navigation[classesIndex].children.sort((a, b) => {
                const isErrorA = a.title.endsWith("Error");
                const isErrorB = b.title.endsWith("Error");
                if (isErrorA && !isErrorB) {
                    return 1;
                }
                if (!isErrorA && isErrorB) {
                    return -1;
                }
                return a.title.localeCompare(b.title);
            });
        }

        const resultArray = navigation.map((item) => ({
            group: item.title,
            pages: item.children.map((child) => `sdk-reference/wallets/${child.path.replace(".mdx", "")}`),
        }));

        // simply output to console, we then manually copy/paste into mint.json in Mintlify
        console.log(JSON.stringify(resultArray));
    });

    // this adds the title to top of every mdx file as Mintlify expects
    // @todo - add description to important SDK classes and set `description` here also
    app.renderer.on(MarkdownPageEvent.BEGIN, (page) => {
        page.frontmatter = {
            title: TITLE_OVERRIDES[page.url] ?? page.model?.name,
            ...page.frontmatter,
        };
    });

    app.renderer.on(MarkdownPageEvent.END, (page) => {
        // remove .mdx from links so it works with mintlify
        page.contents = page.contents.replace(/\.mdx/g, "");

        // viem's JSDoc uses site-absolute paths like `(/docs/glossary/terms#filter)`.
        // Prefix them with https://viem.sh so they resolve to viem's docs.
        page.contents = page.contents.replace(/\]\(\/docs\//g, "](https://viem.sh/docs/");

        // add "./" to bare relative links (so Mintlify keeps them in-tab) — leave
        // absolute paths (/...), parent-relative (../), and full URLs alone.
        page.contents = page.contents.replace(/\]\((?!http|\/|\.{2}\/)/g, "](./");

        const frontmatterMatch = page.contents.match(/^---\n[\s\S]*?\n---\n/);
        if (frontmatterMatch) {
            const idx = frontmatterMatch[0].length;
            const body = page.contents.slice(idx).replace(/^\n+/, "");
            page.contents = `${frontmatterMatch[0]}\n${VERSION_BANNER}\n\n${body}`;
        } else {
            page.contents = `${VERSION_BANNER}\n\n${page.contents.replace(/^\n+/, "")}`;
        }
    });
}
