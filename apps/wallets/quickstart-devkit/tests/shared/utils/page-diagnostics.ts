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

    // The SDK rethrows an API failure with only its `message`, dropping the `error`
    // object the message tells you to read. Reading the response body here is the
    // only place the revert type, reason and simulation link survive.
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

// A single SDK failure emits a long chain — the attestation retries, the frame giving up,
// the handshake timeout, then one line per call that unwound. The first entry names the
// cause and the last only names the symptom, so a short tail reports the wrong one.
export function recentPageDiagnostics(page: Page, limit = 20): string {
    const entries = diagnosticsByPage.get(page) ?? [];
    if (entries.length === 0) {
        return "";
    }
    // An API error body names the cause, but the SDK logs several lines after it, so
    // a plain tail drops the one entry worth reading.
    const apiErrors = entries.filter((entry) => entry.startsWith(API_ERROR_PREFIX)).slice(-2);
    const recent = entries.slice(-limit).filter((entry) => !apiErrors.includes(entry));
    return ` Recent browser output: ${[...apiErrors, ...recent].join(" | ")}`;
}
