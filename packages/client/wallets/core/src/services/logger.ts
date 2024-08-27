import { SDKLogger, getBrowserLogger } from "@crossmint/client-sdk-base";

import { SCW_SERVICE } from "../utils/constants";

export const scwLogger = new SDKLogger(SCW_SERVICE);
export const scwDatadogLogger = new SDKLogger(SCW_SERVICE, getBrowserLogger(SCW_SERVICE, { onlyDatadog: true }));
