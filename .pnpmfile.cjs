const { execFileSync } = require("child_process");
const https = require("https");

const CHECK_HOST = "libraries.cgr.dev";
const CHECK_PATH = "/javascript/lodash";
const SKIP_VAR = "SKIP_CHAINGUARD_TOKEN_CHECK";
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_ATTEMPTS = 3;

const REMEDY = [
    "  chainctl auth login",
    "  export CHAINGUARD_TOKEN=$(chainctl auth token --audience=libraries.cgr.dev)",
    "  ./scripts/setup-pnpm-auth.sh",
].join("\n");

// Ask pnpm itself, so this sees the credential pnpm will actually send: the repo .npmrc
// holds no tokens, they live in the user-level npmrc that scripts/setup-pnpm-auth.sh writes.
function pnpmConfigGet(key) {
    const value = execFileSync("pnpm", ["config", "get", key], { encoding: "utf8" }).trim();
    return value === "" || value === "undefined" ? null : value;
}

// Either credential shape is keyed to the whole host, because packages Chainguard has not
// rebuilt yet are served from /javascript-upstream/.
function chainguardCredential() {
    const bearer = pnpmConfigGet(`//${CHECK_HOST}/:_authToken`);
    if (bearer != null) {
        return { header: `Bearer ${bearer}`, name: `//${CHECK_HOST}/:_authToken` };
    }
    const basic = pnpmConfigGet(`//${CHECK_HOST}/:_auth`);
    if (basic != null) {
        return { header: `Basic ${basic}`, name: `//${CHECK_HOST}/:_auth` };
    }
    return null;
}

class TransientError extends Error {}

function probeChainguard(header) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const settle = (fn, value) => {
            if (!settled) {
                settled = true;
                fn(value);
            }
        };
        const req = https.request(
            {
                hostname: CHECK_HOST,
                path: CHECK_PATH,
                method: "HEAD",
                headers: { Authorization: header },
                timeout: REQUEST_TIMEOUT_MS,
            },
            (res) => {
                res.resume();
                settle(resolve, res.statusCode);
            }
        );
        req.on("error", (err) => settle(reject, new TransientError(`could not reach Chainguard (${err.message})`)));
        req.on("timeout", () => {
            req.destroy();
            settle(reject, new TransientError(`timed out after ${REQUEST_TIMEOUT_MS}ms`));
        });
        req.end();
    });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Only a definitive auth rejection means the credential is bad. Timeouts, connection errors,
// 429 and 5xx say nothing about the token, so they are retried with backoff and jitter.
async function verifyChainguardToken({ header, name }) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const statusCode = await probeChainguard(header);
            if (statusCode === 200) {
                return;
            }
            if (statusCode === 429 || statusCode >= 500) {
                throw new TransientError(`Chainguard answered HTTP ${statusCode}`);
            }
            throw new Error(
                `${name} was rejected by Chainguard (HTTP ${statusCode}): it is likely expired or invalid. Refresh it:\n\n${REMEDY}\n`
            );
        } catch (err) {
            if (!(err instanceof TransientError)) {
                throw err;
            }
            lastError = err;
            if (attempt < MAX_ATTEMPTS) {
                const delay = attempt * 2000 + Math.floor(Math.random() * 2000);
                console.warn(
                    `Validating ${name} against Chainguard: ${err.message}; retrying in ${delay}ms (attempt ${attempt}/${MAX_ATTEMPTS})`
                );
                await sleep(delay);
            }
        }
    }
    throw new TransientError(
        `Could not validate ${name} against Chainguard after ${MAX_ATTEMPTS} attempts: ${lastError.message}.\n` +
            `Set ${SKIP_VAR}=1 to bypass this check if you are intentionally offline.`
    );
}

// With a frozen lockfile nothing can be rewritten and a bad token surfaces as a plain 401
// from pnpm, so a Chainguard outage alone should not fail the job.
function lockfileIsFrozen() {
    const argv = process.argv;
    if (argv.includes("--no-frozen-lockfile") || argv.includes("--frozen-lockfile=false")) {
        return false;
    }
    if (argv.includes("--frozen-lockfile") || argv.includes("--frozen-lockfile=true")) {
        return true;
    }
    const ci = process.env.CI;
    if (ci != null && ci !== "" && ci !== "false") {
        return true;
    }
    return pnpmConfigGet("frozen-lockfile") === "true";
}

module.exports = {
    hooks: {
        async preResolution() {
            if (process.env[SKIP_VAR] === "1") {
                return;
            }
            // Outside the organization the lockfile is re-resolved from npmjs.org (see README),
            // and there is no Chainguard credential to validate.
            const registry = pnpmConfigGet("registry") ?? "";
            if (!registry.startsWith(`https://${CHECK_HOST}/`)) {
                return;
            }
            const credential = chainguardCredential();
            if (credential == null) {
                throw new Error(
                    `pnpm has no credential configured for ${CHECK_HOST}, so every download from it would fail with HTTP 401.\n\n` +
                        "This repo resolves dependencies through Chainguard Libraries, not npmjs.org directly. " +
                        "pnpm reads the credential from the user-level npmrc, so exporting CHAINGUARD_TOKEN alone is not enough: " +
                        "scripts/setup-pnpm-auth.sh writes it there, from either CHAINGUARD_TOKEN or the " +
                        "CHAINGUARD_JAVASCRIPT_IDENTITY_ID + CHAINGUARD_JAVASCRIPT_TOKEN pull-token pair:\n\n" +
                        `${REMEDY}\n`
                );
            }
            try {
                await verifyChainguardToken(credential);
            } catch (err) {
                if (err instanceof TransientError && lockfileIsFrozen()) {
                    console.warn(
                        `WARN ${err.message}\nLockfile is frozen; continuing without validating the credential.`
                    );
                    return;
                }
                throw err;
            }
        },
    },
};
