import { SCW_SERVICE } from "@/utils/constants";

import { SDKLogger } from "@crossmint/client-sdk-base";

export const scwLogger = new SDKLogger(SCW_SERVICE);
