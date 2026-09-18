import type { Page } from "@playwright/test";

const MAX_ENTRIES = 50;
const diagnosticsByPage = new WeakMap<Page, string[]>();

function record(page: Page, entry: string): void {
    const entries = diagnosticsByPage.get(page);
    if (entries == null) {
        return;
    }
    entries.push(entry.replace(/\s+/g, " ").slice(0, 500));
    if (entries.length > MAX_ENTRIES) {
        entries.shift();
    }
}

/**
 * The devkit reports most failures through the browser rather than the DOM: the SDK
 * logs codes such as SIGNER_LIMIT_EXCEEDED to the console, and the transfer and
 * approval components report errors with a native alert(). Playwright dismisses an
 * unlistened dialog and leaves no trace of it, so a test that waits on page text sees
 * nothing at all. Capturing all three channels lets a timeout quote its own cause.
 */
export function attachPageDiagnostics(page: Page): void {
    diagnosticsByPage.set(page, []);

    page.on("console", (message) => {
        const type = message.type();
        if (type !== "error" && type !== "warning") {
            return;
        }
        record(page, `console.${type}: ${message.text()}`);
    });

    page.on("pageerror", (error) => {
        record(page, `pageerror: ${error.message}`);
    });

    page.on("dialog", async (dialog) => {
        record(page, `dialog.${dialog.type()}: ${dialog.message()}`);
        // Playwright dismisses dialogs automatically only while no listener is
        // registered, so this keeps the behaviour the tests were written against.
        await dialog.dismiss().catch(() => undefined);
    });
}

export function recentPageDiagnostics(page: Page, limit = 5): string {
    const entries = diagnosticsByPage.get(page) ?? [];
    if (entries.length === 0) {
        return "";
    }
    return ` Recent browser output: ${entries.slice(-limit).join(" | ")}`;
}
