// notify-slack.js
// Parses JUnit XML results from iOS and Android Maestro runs and posts a
// combined summary to Slack via SLACK_WEBHOOK.
//
// Expected env vars (set by the CI workflow):
//   SLACK_WEBHOOK, GITHUB_RUN_ID, GITHUB_REPOSITORY, GITHUB_SHA,
//   IOS_OUTCOME, ANDROID_OUTCOME
//
// Expected artifact layout (downloaded by the workflow before calling this script):
//   test-results/ios/maestro-ios-results.xml
//   test-results/android/maestro-android-results.xml

const fs = require("fs");
const https = require("https");

function parseJUnit(filePath) {
    if (!fs.existsSync(filePath)) return { total: 0, passed: 0, failed: 0, skipped: 0, time: 0, failures: [] };
    const xml = fs.readFileSync(filePath, "utf8");
    const suiteMatch = xml.match(/<testsuite[^>]*>/);
    if (!suiteMatch) return { total: 0, passed: 0, failed: 0, skipped: 0, time: 0, failures: [] };
    const attrs = suiteMatch[0];
    const get = (attr) => {
        const m = attrs.match(new RegExp(attr + '="([^"]*)"'));
        return m ? parseFloat(m[1]) : 0;
    };
    const total = get("tests");
    const failed = get("failures") + get("errors");
    const skipped = get("skipped");
    const passed = total - failed - skipped;
    const time = get("time");
    const failures = [];
    for (const m of xml.matchAll(/<testcase[^>]*name="([^"]*)"[^/][^>]*>[\s\S]*?<failure[^>]*>([\s\S]*?)<\/failure>/g)) {
        failures.push({ name: m[1], error: m[2].trim().substring(0, 200) });
    }
    return { total, passed, failed, skipped, time, failures };
}

const ios = parseJUnit("test-results/ios/maestro-ios-results.xml");
const android = parseJUnit("test-results/android/maestro-android-results.xml");
const iosOutcome = process.env.IOS_OUTCOME;
const androidOutcome = process.env.ANDROID_OUTCOME;

const overallFailed =
    ios.failed > 0 || android.failed > 0 || iosOutcome === "failure" || androidOutcome === "failure";
const statusEmoji = overallFailed ? "\u274C" : "\u2705";
const statusText = overallFailed ? "Failed" : "Passed";

const runUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
const commitUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/commit/${process.env.GITHUB_SHA}`;
const shortSha = process.env.GITHUB_SHA.substring(0, 7);

const platformSummary = (label, outcome, stats) => {
    if (outcome === "failure" && stats.total === 0) return `*${label}:*\n\u274C Job failed (build or setup error)`;
    if (outcome === "skipped") return `*${label}:*\n\u23ED Skipped`;
    const parts = [`${stats.passed}\u2705`];
    if (stats.failed > 0) parts.push(`${stats.failed}\u274C`);
    if (stats.skipped > 0) parts.push(`${stats.skipped}\u23ED`);
    return `*${label}:*\n${parts.join(" ")} of ${stats.total} tests (${stats.time.toFixed(1)}s)`;
};

const allFailures = [
    ...ios.failures.map((f) => ({ platform: "iOS", ...f })),
    ...android.failures.map((f) => ({ platform: "Android", ...f })),
];

const slackMessage = {
    text: `${statusEmoji} Mobile E2E Regression Tests \u2014 ${statusText}`,
    blocks: [
        {
            type: "header",
            text: { type: "plain_text", text: `${statusEmoji} Mobile E2E Regression Tests \u2014 ${statusText}` },
        },
        {
            type: "section",
            fields: [
                { type: "mrkdwn", text: platformSummary("iOS", iosOutcome, ios) },
                { type: "mrkdwn", text: platformSummary("Android", androidOutcome, android) },
            ],
        },
        {
            type: "section",
            text: {
                type: "mrkdwn",
                text: `*Run:* <${runUrl}|View workflow>\n*Commit:* <${commitUrl}|${shortSha}>`,
            },
        },
    ],
};

if (allFailures.length > 0) {
    const failText = allFailures
        .slice(0, 10)
        .map((f) => `\u2022 [${f.platform}] *${f.name}*\n  \`${f.error}${f.error.length >= 200 ? "..." : ""}\``)
        .join("\n\n");
    slackMessage.blocks.push({
        type: "section",
        text: {
            type: "mrkdwn",
            text:
                `*Failed Tests (first ${Math.min(10, allFailures.length)}):*\n\n${failText}` +
                (allFailures.length > 10 ? `\n\n_...and ${allFailures.length - 10} more_` : ""),
        },
    });
}

slackMessage.blocks.push({ type: "divider" });
slackMessage.blocks.push({
    type: "section",
    text: { type: "mrkdwn", text: `\uD83D\uDD17 <${runUrl}|View full logs and artifacts>` },
});

const webhookUrl = process.env.SLACK_WEBHOOK;
if (!webhookUrl) {
    console.error("SLACK_WEBHOOK not set");
    process.exit(1);
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
    res.on("data", (c) => {
        data += c;
    });
    res.on("end", () => {
        if (res.statusCode === 200) {
            console.log("\u2705 Slack notification sent");
        } else {
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
