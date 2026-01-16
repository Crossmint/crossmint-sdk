#!/usr/bin/env node

const fs = require("fs");

const resultsPath = process.argv[2];

if (!resultsPath) {
    console.error("Usage: node generate-test-report.js <results-json-path>");
    process.exit(1);
}

if (!fs.existsSync(resultsPath)) {
    console.error(`Results file not found: ${resultsPath}`);
    process.exit(1);
}

const fileContent = fs.readFileSync(resultsPath, "utf8");
if (!fileContent || fileContent.trim().length === 0) {
    console.error(`Results file is empty: ${resultsPath}`);
    process.exit(1);
}

let results;
try {
    results = JSON.parse(fileContent);
} catch (error) {
    console.error(`Failed to parse JSON from ${resultsPath}:`, error.message);
    console.error(`File content (first 500 chars): ${fileContent.substring(0, 500)}`);
    process.exit(1);
}

if (!results) {
    console.error(`Parsed results is null or undefined`);
    process.exit(1);
}

// Debug: log the structure to understand the format
if (process.env.DEBUG) {
    console.error("Results structure:", JSON.stringify(Object.keys(results), null, 2));
    if (results.suites) {
        console.error("Number of suites:", results.suites.length);
        if (results.suites[0]) {
            console.error("First suite keys:", Object.keys(results.suites[0]));
        }
    }
}

// Playwright JSON reporter outputs: { suites: [...] }
// Each suite has: { specs: [...] }
// Each spec has: { tests: [...] }
// Each test has: { results: [{ status, duration, ... }] }

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;
let duration = 0;

if (results.suites && Array.isArray(results.suites)) {
    results.suites.forEach((suite) => {
        if (suite.specs && Array.isArray(suite.specs)) {
            suite.specs.forEach((spec) => {
                if (spec.tests && Array.isArray(spec.tests)) {
                    spec.tests.forEach((test) => {
                        totalTests++;
                        const result = test.results && test.results[0] ? test.results[0] : null;
                        const status = result?.status || "unknown";
                        
                        if (status === "passed") {
                            passedTests++;
                        } else if (status === "failed") {
                            failedTests++;
                        } else if (status === "skipped") {
                            skippedTests++;
                        }
                        
                        if (result?.duration) {
                            duration += result.duration;
                        }
                    });
                }
            });
        }
    });
} else {
    // Fallback: if structure is different, log error to stderr (won't affect report output)
    console.error("⚠️ Unexpected JSON structure. Expected 'suites' array.");
    console.error("Top-level keys:", Object.keys(results));
    if (process.env.DEBUG) {
        console.error("Full structure:", JSON.stringify(results, null, 2));
    }
    // Still output a report with 0 tests so the comment gets updated
}

let report = "";

const statusEmoji = failedTests > 0 ? "❌" : skippedTests > 0 ? "⚠️" : "✅";
report += `${statusEmoji} **Status**: ${failedTests > 0 ? "Failed" : skippedTests > 0 ? "Passed with skipped tests" : "Passed"}\n\n`;

report += "### Statistics\n\n";
report += `- **Total Tests**: ${totalTests}\n`;
report += `- **Passed**: ${passedTests} ✅\n`;
report += `- **Failed**: ${failedTests} ${failedTests > 0 ? "❌" : ""}\n`;
report += `- **Skipped**: ${skippedTests} ${skippedTests > 0 ? "⚠️" : ""}\n`;
report += `- **Duration**: ${(duration / 1000).toFixed(2)}s\n\n`;

if (failedTests > 0 || skippedTests > 0) {
    report += "### Test Details\n\n";

    if (results.suites && Array.isArray(results.suites)) {
        results.suites.forEach((suite) => {
            if (suite.specs && Array.isArray(suite.specs)) {
                suite.specs.forEach((spec) => {
                    if (spec.tests && Array.isArray(spec.tests)) {
                        spec.tests.forEach((test) => {
                            const result = test.results && test.results[0] ? test.results[0] : null;
                            const status = result?.status || "unknown";

                            if (status === "failed" || status === "skipped") {
                                const emoji = status === "failed" ? "❌" : "⚠️";
                                const specTitle = spec.title || "Unknown Spec";
                                const testTitle = test.title || "Unknown Test";
                                report += `${emoji} **${specTitle}** - ${testTitle}\n`;

                                if (status === "failed" && result?.error) {
                                    report += `   \`\`\`\n   ${result.error.message}\n   \`\`\`\n`;
                                }

                                if (status === "skipped") {
                                    report += `   *Test was skipped*\n`;
                                }

                                report += "\n";
                            }
                        });
                    }
                });
            }
        });
    }
}

if (failedTests === 0 && skippedTests === 0) {
    report += "### ✅ All smoke tests passed!\n\n";
    report += "All critical flows are working correctly.\n";
}

report += "\n---\n";
report += "*This is a non-blocking smoke test. Full regression tests run separately.*\n";

console.log(report);
