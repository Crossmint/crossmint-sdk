import type { Options } from "tsup";
import { treeShakableConfig } from "../../../tsup.config.base";

const config: Options = {
    ...treeShakableConfig,
    // Bundle @hpke/* packages into the output so React Native / Expo consumers
    // don't need to resolve them at runtime. The @hpke/* CJS entry points use a
    // UMD wrapper that shadows `require`, preventing Metro from statically
    // detecting @hpke/common as a transitive dependency of @hpke/core.
    // By inlining them here the problem disappears for every downstream consumer.
    noExternal: [/@hpke\/.*/],
};

export default config;
