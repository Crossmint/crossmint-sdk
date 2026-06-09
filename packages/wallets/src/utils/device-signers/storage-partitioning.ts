/**
 * Minimum Chromium version that enables third-party storage partitioning by default.
 * Before Chrome 115, different embedders of the same iframe origin share the same
 * IndexedDB, which lets an attacker-controlled page access delegated keys.
 * See https://developer.chrome.com/blog/storage-partitioning
 */
const MIN_CHROMIUM_VERSION = 115;
const MIN_FIREFOX_VERSION = 103;

/**
 * Detects whether the current browser provides third-party storage partitioning.
 * Returns `true` when the environment is safe to operate in, `false` otherwise.
 *
 * Detection strategy:
 * - Chromium-based browsers (Chrome, Edge, Opera, etc.): require version >= 115.
 * - Firefox: ships State Partitioning (dFPI) by default since v103.
 * - Safari: ships ITP-based storage partitioning.
 * - Unknown browsers: blocked (fail-safe).
 */
export function hasPartitionedStorage(): boolean {
    if (typeof navigator === "undefined") {
        return false;
    }

    const ua = navigator.userAgent;

    // Chromium-based browsers (Chrome, Edge, Opera, Brave, etc.)
    // all include "Chrome/<version>" in their UA string.
    const chromiumMatch = ua.match(/Chrome\/(\d+)/);
    if (chromiumMatch != null) {
        return parseInt(chromiumMatch[1], 10) >= MIN_CHROMIUM_VERSION;
    }

    // Firefox ships State Partitioning (dFPI) enabled by default since v103.
    const firefoxMatch = ua.match(/Firefox\/(\d+)/);
    if (firefoxMatch != null) {
        return parseInt(firefoxMatch[1], 10) >= MIN_FIREFOX_VERSION;
    }

    // Safari ships ITP-based storage partitioning since Safari 11 (2017).
    // No version gate — any Safari old enough to lack ITP would also lack the
    // Web Crypto APIs this signer depends on, so it cannot operate regardless.
    // Safari's UA contains "Safari/" but NOT "Chrome/" (already handled above).
    if (/Safari\/\d+/.test(ua)) {
        return true;
    }

    // Unknown browser — fail-safe: refuse to operate.
    return false;
}
