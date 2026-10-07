import type { AndroidConfig } from "expo/config-plugins";

type AndroidManifest = AndroidConfig.Manifest.AndroidManifest;
type ManifestQuery = AndroidConfig.Manifest.ManifestQuery;

export function addQueryToAndroidManifest(androidManifest: AndroidManifest, query: ManifestQuery): AndroidManifest {
    const manifest = androidManifest.manifest;

    if (!manifest.queries) {
        manifest.queries = [];
    }

    // `expo prebuild` without --clean runs the plugin on a manifest it already changed.
    const alreadyPresent = manifest.queries.some((existing) => JSON.stringify(existing) === JSON.stringify(query));
    if (!alreadyPresent) {
        manifest.queries.push(query);
    }

    return androidManifest;
}
