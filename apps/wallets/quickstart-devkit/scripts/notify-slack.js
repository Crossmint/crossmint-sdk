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
const statusText = overallFailed ? "Failed" : "Passed";
const runUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const commitUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/commit/${process.env.GITHUB_SHA}`;
const shortSha = process.env.GITHUB_SHA.substring(0, 7);

function browserSummary(browser, result) {
    if (!result) return `*${browser}:* \u274C  No results \u2014 job failed or was cancelled`;
    const durationMin = (result.duration / 60000).toFixed(1);
    const counts = [`${result.passedTests} \u2705 passed`];
    if (result.failedTests > 0) counts.push(`${result.failedTests} \u274C failed`);
    if (result.skippedTests > 0) counts.push(`${result.skippedTests} \u23ED skipped`);
    return `*${browser}:*  ${counts.join("  \u00B7  ")}  _of ${result.totalTests} total (${durationMin}m)_`;
}

const summaryLines = browsers.map((b) => browserSummary(b, browserResults[b])).join("\n\n");

const slackMessage = {
    text: `${statusEmoji} E2E Regression Tests \u2014 ${statusText}`,
    blocks: [
        {
            type: "header",
            text: { type: "plain_text", text: `${statusEmoji} E2E Regression Tests \u2014 ${statusText}` },
        },
        {
            type: "section",
            text: { type: "mrkdwn", text: summaryLines },
        },
        { type: "divider" },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Run:* <${runUrl}|View workflow>   \u00B7   *Commit:* <${commitUrl}|${shortSha}>`,
            },
        },
    ],
};

const allFailures = browsers.flatMap((b) => (browserResults[b]?.failures || []).map((f) => ({ browser: b, ...f })));

if (allFailures.length > 0) {
    const shown = allFailures.slice(0, 10);
    const failText = shown
        .map((f) => {
            const cleanError =
                stripAnsi(f.error)
                    .split("\n")
                    .find((l) => l.trim()) || "No error message";
            const truncatedError = cleanError.length > 250 ? cleanError.substring(0, 250) + "..." : cleanError;
            const suiteStr = f.suite ? `\n_${f.suite}_` : "";
            return `\u2022 *[${f.browser}]* ${f.title}${suiteStr}\n\`${truncatedError}\``;
        })
        .join("\n\n");

    slackMessage.blocks.push({ type: "divider" });
    slackMessage.blocks.push({
        type: "section",
        text: {
            type: "mrkdwn",
            text: `*\u274C Failed Tests (${Math.min(10, allFailures.length)} of ${allFailures.length}):*\n\n${failText}${allFailures.length > 10 ? `\n\n_...and ${allFailures.length - 10} more failures_` : ""}`,
        },
    });
}

slackMessage.blocks.push({ type: "divider" });
slackMessage.blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: `\uD83D\uDD17 <${runUrl}|View full logs and artifacts>` },
});

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
