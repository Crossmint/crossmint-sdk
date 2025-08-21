import type { AndroidManifest, ManifestQuery } from "@expo/config-plugins/build/android/Manifest";

export function addQueryToAndroidManifest(androidManifest: AndroidManifest, query: ManifestQuery): AndroidManifest {
    const manifest = androidManifest.manifest;

    if (!manifest.queries) {
        manifest.queries = [];
    }

    manifest.queries.push(query);

    return androidManifest;
}
