#!/usr/bin/env bash
set -euo pipefail

NPMRC="${NPM_CONFIG_USERCONFIG:-$HOME/.npmrc}"
mkdir -p "$(dirname "$NPMRC")"

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

if [ -n "${CHAINGUARD_TOKEN:-}" ]; then
    drop_auth '//libraries.cgr.dev/:_auth'
    set_auth '//libraries.cgr.dev/:_authToken' "$CHAINGUARD_TOKEN"
    header="Bearer $CHAINGUARD_TOKEN"
elif [ -n "${CHAINGUARD_JAVASCRIPT_IDENTITY_ID:-}" ] && [ -n "${CHAINGUARD_JAVASCRIPT_TOKEN:-}" ]; then
    basic="$(printf '%s:%s' "$CHAINGUARD_JAVASCRIPT_IDENTITY_ID" "$CHAINGUARD_JAVASCRIPT_TOKEN" | base64 | tr -d '\n')"
    drop_auth '//libraries.cgr.dev/:_authToken'
    set_auth '//libraries.cgr.dev/:_auth' "$basic"
    header="Basic $basic"
else
    echo "No Chainguard credentials found. Run:" >&2
    echo "  chainctl auth login" >&2
    echo "  export CHAINGUARD_TOKEN=\$(chainctl auth token --audience=libraries.cgr.dev)" >&2
    exit 1
fi

[ "${SKIP_CHAINGUARD_TOKEN_CHECK:-}" = 1 ] && exit 0
status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 -H "Authorization: $header" \
    https://libraries.cgr.dev/javascript/lodash 2>/dev/null || echo 000)"
case "$status" in
    200) ;;
    401 | 403)
        echo "Chainguard rejected the credential (HTTP $status): it is likely expired or invalid. Refresh it:" >&2
        echo "  chainctl auth login" >&2
        echo "  export CHAINGUARD_TOKEN=\$(chainctl auth token --audience=libraries.cgr.dev)" >&2
        echo "  ./scripts/setup-pnpm-auth.sh" >&2
        exit 1
        ;;
    *) echo "warning: could not validate the Chainguard credential (HTTP $status); continuing" >&2 ;;
esac
