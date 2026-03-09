#!/bin/bash
# Publish packages to npm using OIDC trusted publishing.
# This script iterates through all workspace packages, checks if the version
# is already published on npm, and publishes new versions using `npm publish`.
#
# Requirements:
#   - Node.js 24+ (for OIDC support)
#   - npm 11.6.2+ (for OIDC trusted publishing)
#   - GitHub Actions with `id-token: write` permission
#   - Trusted publishing configured on npmjs.com for each package

set -euo pipefail

PACKAGES_DIR="packages"
PUBLISHED=0
SKIPPED=0
FAILED=0

echo "Starting OIDC trusted publishing..."
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"
echo ""

# Find all package.json files in the packages directory (excluding node_modules and dist)
while IFS= read -r pkg_json; do
    dir=$(dirname "$pkg_json")
    name=$(jq -r '.name // empty' "$pkg_json")
    version=$(jq -r '.version // empty' "$pkg_json")
    private=$(jq -r '.private // empty' "$pkg_json")

    # Skip packages without a name or version
    if [ -z "$name" ] || [ -z "$version" ]; then
        continue
    fi

    # Skip private packages
    if [ "$private" = "true" ]; then
        echo "Skipping $name (private)"
        continue
    fi

    # Check if this version is already published on npm
    published_version=$(npm view "$name@$version" version 2>/dev/null || echo "")

    if [ "$published_version" = "$version" ]; then
        echo "Already published: $name@$version"
        SKIPPED=$((SKIPPED + 1))
    else
        echo "Publishing $name@$version from $dir..."
        if (cd "$dir" && npm publish --provenance --access public); then
            echo "Published $name@$version"
            PUBLISHED=$((PUBLISHED + 1))
        else
            echo "ERROR: Failed to publish $name@$version"
            FAILED=$((FAILED + 1))
        fi
    fi
done < <(find "$PACKAGES_DIR" -name "package.json" -not -path "*/node_modules/*" -not -path "*/dist/*")

echo ""
echo "Publishing complete: $PUBLISHED published, $SKIPPED skipped, $FAILED failed"

if [ "$FAILED" -gt 0 ]; then
    echo "ERROR: Some packages failed to publish"
    exit 1
fi
