import type { Options } from "tsup";

import { treeShakableConfig } from "../../../../tsup.config.base";

const config: Options = {
    ...treeShakableConfig,
    external: ["react", "react-dom", "@dynamic-labs/utils/src/services/Oauth2Service/utils/loadAppleId/loadAppleId"],
};

export default config;
