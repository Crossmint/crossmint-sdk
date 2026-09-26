import type { Page } from "@playwright/test";

const MAX_ENTRIES = 50;
const MAX_ENTRY_LENGTH = 500;
const MAX_API_ERROR_LENGTH = 2000;
const API_ERROR_PREFIX = "api.";
const diagnosticsByPage = new WeakMap<Page, string[]>();

function record(page: Page, entry: string, maxLength = MAX_ENTRY_LENGTH): void {
    const entries = diagnosticsByPage.get(page);
    if (entries == null) {
        return;
    }
    entries.push(entry.replace(/\s+/g, " ").slice(0, maxLength));
    if (entries.length > MAX_ENTRIES) {
        entries.shift();
    }
}

// The devkit reports failures through the console or a native alert(), never the DOM.
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
        // Playwright auto-dismisses only while no listener is registered.
        await dialog.dismiss().catch(() => undefined);
    });

    // The SDK rethrows an API failure with only its `message`, losing the body.
    page.on("response", (response) => {
        const status = response.status();
        const url = response.url();
        if (status < 400 || !url.includes("/api/")) {
            return;
        }
        void response
            .text()
            .then((body) => {
                record(page, `${API_ERROR_PREFIX}${status} ${new URL(url).pathname}: ${body}`, MAX_API_ERROR_LENGTH);
            })
            .catch(() => undefined);
    });
}

export function recentPageDiagnostics(page: Page, limit = 20): string {
    const entries = diagnosticsByPage.get(page) ?? [];
    if (entries.length === 0) {
        return "";
    }
    // A plain tail keeps the symptoms and drops the API error that names the cause.
    const apiErrors = entries.filter((entry) => entry.startsWith(API_ERROR_PREFIX)).slice(-2);
    const recent = entries.slice(-limit).filter((entry) => !apiErrors.includes(entry));
    return ` Recent browser output: ${[...apiErrors, ...recent].join(" | ")}`;
}
