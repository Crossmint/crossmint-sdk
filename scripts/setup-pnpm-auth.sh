#!/usr/bin/env bash
# Store the Chainguard registry credential in the user-level npmrc, which pnpm reads.
#
# The repo's .npmrc only routes scopes to registries, so no token ever sits in the repo.
# The entry covers the whole libraries.cgr.dev host because packages Chainguard has not
# rebuilt yet are served from /javascript-upstream/.
#
# Usage: scripts/setup-pnpm-auth.sh, with one of:
#   CHAINGUARD_TOKEN                      chainctl auth token --audience=libraries.cgr.dev
#   CHAINGUARD_JAVASCRIPT_IDENTITY_ID and CHAINGUARD_JAVASCRIPT_TOKEN
#                                         a pull token, where chainctl cannot log in
set -euo pipefail

NPMRC="${NPM_CONFIG_USERCONFIG:-$HOME/.npmrc}"
mkdir -p "$(dirname "$NPMRC")"

# Plain shell rather than `npm config set`, so this works where npm itself is unavailable.
drop_auth() {
    local key=$1 tmp="$NPMRC.tmp.$$"
    touch "$NPMRC"
    grep -v "^${key}=" "$NPMRC" >"$tmp" || true
    chmod 600 "$tmp"
    mv "$tmp" "$NPMRC"
}

set_auth() {
    drop_auth "$1"
    printf '%s=%s\n' "$1" "$2" >>"$NPMRC"
}

# Only one credential shape may be left in the file: pnpm prefers _authToken, so a stale
# one would silently shadow a valid _auth.
if [ -n "${CHAINGUARD_TOKEN:-}" ]; then
    drop_auth '//libraries.cgr.dev/:_auth'
    set_auth '//libraries.cgr.dev/:_authToken' "$CHAINGUARD_TOKEN"
elif [ -n "${CHAINGUARD_JAVASCRIPT_IDENTITY_ID:-}" ] && [ -n "${CHAINGUARD_JAVASCRIPT_TOKEN:-}" ]; then
    drop_auth '//libraries.cgr.dev/:_authToken'
    set_auth '//libraries.cgr.dev/:_auth' \
        "$(printf '%s:%s' "$CHAINGUARD_JAVASCRIPT_IDENTITY_ID" "$CHAINGUARD_JAVASCRIPT_TOKEN" | base64 | tr -d '\n')"
else
    echo "No Chainguard credentials found. Run:" >&2
    echo "  chainctl auth login" >&2
    echo "  export CHAINGUARD_TOKEN=\$(chainctl auth token --audience=libraries.cgr.dev)" >&2
    exit 1
fi
