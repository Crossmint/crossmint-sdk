#!/usr/bin/env node
/**
 * Parses Playwright JSON results for chromium/firefox/webkit and posts
 * a formatted summary to Slack via incoming webhook.
 *
 * Required env vars:
 *   SLACK_WEBHOOK        — Slack incoming webhook URL
 *   GITHUB_RUN_ID        — GitHub Actions run ID
 *   GITHUB_REPOSITORY    — e.g. "Crossmint/crossmint-sdk"
 *   GITHUB_SHA           — full commit SHA
 *   MATRIX_RESULT        — overall matrix result from needs context
 *
 * Reads artifacts from:
 *   test-results/chromium/playwright-results.json
 *   test-results/firefox/playwright-results.json
 *   test-results/webkit/playwright-results.json
 */

const fs = require("fs");
const https = require("https");
const path = require("path");

const webhookUrl = process.env.SLACK_WEBHOOK;
if (!webhookUrl) {
    console.error("SLACK_WEBHOOK environment variable is not set");
    process.exit(1);
}

const browsers = ["chromium", "firefox", "webkit"];

const SLACK_SECTION_TEXT_LIMIT = 3000;
const SLACK_HEADER_TEXT_LIMIT = 150;
// Budget reserved for the "...and N more" trailer.
const FAILURE_BLOCK_OVERHEAD = 120;

const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// Strip ANSI escape codes produced by Playwright error formatting
function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*[mGKHFJA-Za-z]/g, "");
}

function parseResults(filePath) {
    if (!fs.existsSync(filePath)) return null;
    try {
        const results = JSON.parse(fs.readFileSync(filePath, "utf8"));
        let totalTests = 0,
            passedTests = 0,
            failedTests = 0,
            skippedTests = 0,
            duration = 0;
        const failures = [];

        // spec.title is the test name; suite path is built from ancestor describe blocks
        function processSpec(spec, suitePath) {
            if (!spec.tests) return;
            spec.tests.forEach((test) => {
                totalTests++;
                const result = test.results && test.results[0] ? test.results[0] : null;
                const status = result?.status || "unknown";
                if (status === "passed") passedTests++;
                else if (status === "failed") {
                    failedTests++;
                    failures.push({
                        title: spec.title || test.title || "Unknown Test",
                        suite: suitePath,
                        error: result?.error?.message || "No error message",
                    });
                } else if (status === "skipped") skippedTests++;
                if (result?.duration) duration += result.duration;
            });
        }

        function processSuite(suite, parentPath) {
            const currentPath = parentPath ? `${parentPath} › ${suite.title}` : suite.title;
            if (suite.specs) suite.specs.forEach((spec) => processSpec(spec, currentPath));
            if (suite.tests) {
                suite.tests.forEach((test) => {
                    totalTests++;
                    const result = test.results && test.results[0] ? test.results[0] : null;
                    const status = result?.status || "unknown";
                    if (status === "passed") passedTests++;
                    else if (status === "failed") {
                        failedTests++;
                        failures.push({
                            title: test.title || suite.title || "Unknown Test",
                            suite: parentPath || "",
                            error: result?.error?.message || "No error message",
                        });
                    } else if (status === "skipped") skippedTests++;
                    if (result?.duration) duration += result.duration;
                });
            }
            if (suite.suites) suite.suites.forEach((s) => processSuite(s, currentPath));
        }

        if (results.suites) results.suites.forEach((s) => processSuite(s, ""));

        if (totalTests === 0 && results.stats) {
            passedTests = results.stats.expected || results.stats.passed || 0;
            failedTests = results.stats.unexpected || results.stats.failed || 0;
            skippedTests = results.stats.skipped || 0;
            totalTests = passedTests + failedTests + skippedTests + (results.stats.flaky || 0);
            duration = results.stats.duration || 0;
        }

        return { totalTests, passedTests, failedTests, skippedTests, duration, failures };
    } catch (e) {
        console.error("Error parsing results:", e.message);
        return null;
    }
}

const browserResults = {};
let overallFailed = process.env.MATRIX_RESULT === "failure" || process.env.MATRIX_RESULT === "cancelled";

for (const browser of browsers) {
    const filePath = path.join("test-results", browser, "playwright-results.json");
    const result = parseResults(filePath);
    browserResults[browser] = result;
    if (result && result.failedTests > 0) overallFailed = true;
}

const statusEmoji = overallFailed ? "\u274C" : "\u2705";
const runUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const commitUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/commit/${process.env.GITHUB_SHA}`;
const shortSha = process.env.GITHUB_SHA.substring(0, 7);

const reported = browsers.filter((b) => browserResults[b] != null);
const missing = browsers.filter((b) => browserResults[b] == null);

const totals = reported.reduce(
    (acc, b) => {
        const r = browserResults[b];
        acc.total += r.totalTests;
        acc.passed += r.passedTests;
        acc.failed += r.failedTests;
        acc.skipped += r.skippedTests;
        acc.duration += r.duration;
        return acc;
    },
    { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 }
);

let headline = `${totals.passed}/${totals.total} passed`;
if (totals.failed > 0) {
    headline = `${totals.failed} of ${totals.total} failed`;
} else if (missing.length > 0) {
    // A cancelled job uploads no artifact, so a run can fail with zero failed tests.
    headline = `no results from ${missing.join(", ")}`;
}
const title = `${statusEmoji} E2E Regression Tests \u2014 ${headline}`.slice(0, SLACK_HEADER_TEXT_LIMIT);

const statsLine = [
    ...browsers.map((b) => {
        const r = browserResults[b];
        return r == null ? `${b} no results` : `${b} ${r.passedTests}/${r.totalTests}`;
    }),
    `${(totals.duration / 60000).toFixed(1)}m`,
    ...(totals.skipped > 0 ? [`${totals.skipped} skipped`] : []),
    `<${runUrl}|logs & full report>`,
    `<${commitUrl}|${shortSha}>`,
].join("  \u00B7  ");

const slackMessage = {
    text: title,
    blocks: [
        { type: "header", text: { type: "plain_text", text: title } },
        { type: "context", elements: [{ type: "mrkdwn", text: statsLine }] },
    ],
};

const allFailures = browsers.flatMap((b) => (browserResults[b]?.failures || []).map((f) => ({ browser: b, ...f })));

if (allFailures.length > 0) {
    // The same test failing on every browser is one failure, not three.
    const grouped = new Map();
    for (const f of allFailures) {
        const error =
            stripAnsi(f.error)
                .split("\n")
                .find((l) => l.trim())
                ?.trim() || "No error message";
        const suite = f.suite ? f.suite.split(" \u203A ").pop() : "";
        const name = suite ? `${suite} \u203A ${f.title}` : f.title;
        // Mask the parts that vary per browser without distinguishing one failure from another.
        const signature = error
            .split("Recent browser output:")[0]
            .replace(UUID_PATTERN, "<id>")
            .split(f.browser)
            .join("<browser>");
        const key = `${name}\u0000${signature}`;
        const group = grouped.get(key);
        if (group) {
            group.browsers.push(f.browser);
        } else {
            grouped.set(key, { name, error, browsers: [f.browser] });
        }
    }

    const entries = [...grouped.values()].map((g) => {
        const where =
            g.browsers.length > 1 && g.browsers.length === reported.length
                ? `all ${g.browsers.length} browsers`
                : g.browsers.join(", ");
        const error = g.error.length > 250 ? `${g.error.slice(0, 250)}\u2026` : g.error;
        return `*${g.name}*  \u2014  ${where}\n\`${error}\``;
    });

    // Slack rejects the whole message with `invalid_blocks` when a section passes 3000 characters.
    const shown = [];
    let used = FAILURE_BLOCK_OVERHEAD;
    for (const entry of entries) {
        if (shown.length > 0 && used + entry.length > SLACK_SECTION_TEXT_LIMIT) {
            break;
        }
        shown.push(entry);
        used += entry.length + 2;
    }

    const omitted = entries.length - shown.length;
    const trailer = omitted > 0 ? `\n\n_\u2026and ${omitted} more \u2014 <${runUrl}|full report in the run artifacts>_` : "";
    const failText = `${shown.join("\n\n")}${trailer}`;

    slackMessage.blocks.push({
        type: "section",
        // A lone entry over the limit is always admitted above, so it still needs truncating.
        text: { type: "mrkdwn", text: failText.slice(0, SLACK_SECTION_TEXT_LIMIT) },
    });
}

const url = new URL(webhookUrl);
const postData = JSON.stringify(slackMessage);
const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname + url.search,
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(postData) },
};

const req = https.request(options, (res) => {
    let data = "";
    res.on("data", (c) => (data += c));
    res.on("end", () => {
        if (res.statusCode === 200) console.log("\u2705 Slack notification sent");
        else {
            console.error(`\u274C Slack POST failed: ${res.statusCode} \u2014 ${data}`);
            process.exit(1);
        }
    });
});
req.on("error", (e) => {
    console.error("\u274C " + e.message);
    process.exit(1);
});
req.write(postData);
req.end();
