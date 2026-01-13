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

const results = JSON.parse(fs.readFileSync(resultsPath, "utf8"));

const totalTests = results.suites.reduce((acc, suite) => {
    return (
        acc +
        suite.specs.reduce((specAcc, spec) => {
            return specAcc + spec.tests.length;
        }, 0)
    );
}, 0);

const passedTests = results.suites.reduce((acc, suite) => {
    return (
        acc +
        suite.specs.reduce((specAcc, spec) => {
            return specAcc + spec.tests.filter((test) => test.results[0]?.status === "passed").length;
        }, 0)
    );
}, 0);

const failedTests = results.suites.reduce((acc, suite) => {
    return (
        acc +
        suite.specs.reduce((specAcc, spec) => {
            return specAcc + spec.tests.filter((test) => test.results[0]?.status === "failed").length;
        }, 0)
    );
}, 0);

const skippedTests = results.suites.reduce((acc, suite) => {
    return (
        acc +
        suite.specs.reduce((specAcc, spec) => {
            return specAcc + spec.tests.filter((test) => test.results[0]?.status === "skipped").length;
        }, 0)
    );
}, 0);

const duration = results.suites.reduce((acc, suite) => {
    return (
        acc +
        suite.specs.reduce((specAcc, spec) => {
            return (
                specAcc +
                spec.tests.reduce((testAcc, test) => {
                    return testAcc + (test.results[0]?.duration || 0);
                }, 0)
            );
        }, 0)
    );
}, 0);

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

    results.suites.forEach((suite) => {
        suite.specs.forEach((spec) => {
            spec.tests.forEach((test) => {
                const result = test.results[0];
                const status = result?.status || "unknown";

                if (status === "failed" || status === "skipped") {
                    const emoji = status === "failed" ? "❌" : "⚠️";
                    report += `${emoji} **${spec.title}** - ${test.title}\n`;

                    if (status === "failed" && result?.error) {
                        report += `   \`\`\`\n   ${result.error.message}\n   \`\`\`\n`;
                    }

                    if (status === "skipped") {
                        report += `   *Test was skipped*\n`;
                    }

                    report += "\n";
                }
            });
        });
    });
}

if (failedTests === 0 && skippedTests === 0) {
    report += "### ✅ All smoke tests passed!\n\n";
    report += "All critical flows are working correctly.\n";
}

report += "\n---\n";
report += "*This is a non-blocking smoke test. Full regression tests run separately.*\n";

console.log(report);
