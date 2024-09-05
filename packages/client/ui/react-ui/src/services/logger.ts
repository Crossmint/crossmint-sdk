import { AUTH_SERVICE } from "@/utils";

import { SDKLogger } from "@crossmint/client-sdk-base";

export const authLogger = new SDKLogger(AUTH_SERVICE);
