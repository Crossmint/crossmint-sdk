import type { AndroidConfig } from "expo/config-plugins";

type AndroidManifest = AndroidConfig.Manifest.AndroidManifest;
type ManifestQuery = AndroidConfig.Manifest.ManifestQuery;

export function addQueryToAndroidManifest(androidManifest: AndroidManifest, query: ManifestQuery): AndroidManifest {
    const manifest = androidManifest.manifest;

    if (!manifest.queries) {
        manifest.queries = [];
    }

    manifest.queries.push(query);

    return androidManifest;
}
