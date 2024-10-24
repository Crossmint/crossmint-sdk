import { SDKLogger } from "@crossmint/client-sdk-base";

import { AUTH_SERVICE } from "../utils/constants";

export const authLogger = new SDKLogger(AUTH_SERVICE);
