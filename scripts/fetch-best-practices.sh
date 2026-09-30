#!/usr/bin/env bash
# Caches every .md file of Paella-Labs/best-practices as one file and prints where it is.
# Uses git, so it works with any GitHub credential git already has (HTTPS or SSH).
# Refreshes at most once every 24 hours; when GitHub is unreachable it keeps the last good copy.
# Usage: ./scripts/fetch-best-practices.sh [--print]   (--print writes the whole doc to stdout)

REPO="Paella-Labs/best-practices"
CACHE_DIR="${XDG_CACHE_HOME:-$HOME/.cache}/paella-best-practices"
CACHE_FILE="$CACHE_DIR/best-practices.md"
CHECKED_FILE="$CACHE_DIR/checked"
MAX_AGE=86400

export GIT_TERMINAL_PROMPT=0
export GIT_SSH_COMMAND="${GIT_SSH_COMMAND:-ssh -o BatchMode=yes}"
mkdir -p "$CACHE_DIR"

fresh() {
    [ -f "$CACHE_FILE" ] && [ -f "$CHECKED_FILE" ] || return 1
    [ $(( $(date +%s) - $(cat "$CHECKED_FILE") )) -lt "$MAX_AGE" ]
}

fetch() {
    git init -q --bare "$GIT_DIR_PATH" || return 1
    for attempt in 1 2; do
        for url in "https://github.com/$REPO.git" "git@github.com:$REPO.git"; do
            if git --git-dir="$GIT_DIR_PATH" fetch -q --depth 1 "$url" HEAD 2>/dev/null; then
                return 0
            fi
        done
        [ "$attempt" = 1 ] && sleep 1
    done
    return 1
}

build() {
    local sha tmp
    sha=$(git --git-dir="$GIT_DIR_PATH" rev-parse FETCH_HEAD) || return 1
    tmp=$(mktemp "$CACHE_DIR/best-practices.md.XXXXXX") || return 1
    if (
        paths=$(git --git-dir="$GIT_DIR_PATH" ls-tree -r --name-only "$sha" | grep '\.md$' | sort) || exit 1
        echo "<!-- $REPO@$sha -->"
        echo "# Paella/Crossmint best practices"
        echo "Source: https://github.com/$REPO (commit $sha). Follow these when writing or reviewing code, tests, docs, PRs, deployments and operations; cite the file and rule when flagging a violation."
        echo ""
        while IFS= read -r path; do
            content=$(git --git-dir="$GIT_DIR_PATH" show "$sha:$path") || exit 1
            echo "## $path"
            echo ""
            printf '%s\n' "$content" | sed -E 's/^(#+)/\1##/'
            echo ""
        done <<< "$paths"
    ) > "$tmp" && mv -f "$tmp" "$CACHE_FILE"; then
        return 0
    fi
    rm -f "$tmp"
    return 1
}

report() {
    local sha
    sha=$(sed -n '1s/^<!-- .*@\(.*\) -->$/\1/p' "$CACHE_FILE")
    if [ "${1:-}" = "--print" ]; then
        cat "$CACHE_FILE"
        return
    fi
    echo "Paella-Labs/best-practices (commit ${sha:0:12}) is cached at $CACHE_FILE."
    echo "Read that file before writing or reviewing code, and follow it together with this repo's AGENTS.md. Cite the file and rule when flagging a violation in review. It covers:"
    sed -n 's/^## \(.*\.md\)$/- \1/p' "$CACHE_FILE"
}

if ! fresh; then
    GIT_DIR_PATH=$(mktemp -d "$CACHE_DIR/repo.XXXXXX") || exit 1
    trap 'rm -rf "$GIT_DIR_PATH"' EXIT
    if fetch && build; then
        date +%s > "$CHECKED_FILE.$$" && mv -f "$CHECKED_FILE.$$" "$CHECKED_FILE"
    elif [ -f "$CACHE_FILE" ]; then
        echo "fetch-best-practices: could not refresh $REPO; using the copy cached on $(date -r "$CACHE_FILE" '+%Y-%m-%d' 2>/dev/null || echo 'an earlier run')" >&2
    else
        echo "fetch-best-practices: could not read $REPO with git over HTTPS or SSH and no cached copy exists. Ask for read access to $REPO, or check that git can clone it." >&2
        exit 1
    fi
fi
report "${1:-}"
