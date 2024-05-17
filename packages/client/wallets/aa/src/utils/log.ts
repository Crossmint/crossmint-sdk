import { logError, logInfo } from "@/services/logging";

import { SCW_SERVICE } from "./constants";

export class LoggerWrapper {
    constructor(className: string, private extraInfo = {}) {
        return new Proxy(this, {
            get: (target: any, propKey: PropertyKey, receiver: any) => {
                const origMethod = target[propKey];
                const identifierTag = `[${SCW_SERVICE} - ${className} - ${String(propKey)}]`;

                if (typeof origMethod === "function") {
                    return (...args: any[]) => {
                        logInfo(
                            `${identifierTag} input - ${beautify(args)} - extra_info - ${beautify(extraInfo)}`,
                            addCommonKeysToLog({ args, ...extraInfo })
                        );
                        const result = origMethod.apply(target, args);
                        if (result instanceof Promise) {
                            return result
                                .then((res: any) => {
                                    logInfo(
                                        `${identifierTag} output - ${beautify(res)} - extra_info - ${beautify(
                                            extraInfo
                                        )}`,
                                        addCommonKeysToLog({ res, ...extraInfo })
                                    );
                                    return res;
                                })
                                .catch((err: any) => {
                                    logError(
                                        `${identifierTag} threw_error - ${err} - extra_info - ${beautify(extraInfo)}`,
                                        addCommonKeysToLog({ err, ...extraInfo })
                                    );
                                    throw err;
                                });
                        } else {
                            logInfo(
                                `${identifierTag} output - ${beautify(result)} - extra_info - ${beautify(extraInfo)}`,
                                addCommonKeysToLog({ res: result, ...extraInfo })
                            );
                            return result;
                        }
                    };
                }
                return Reflect.get(target, propKey, receiver);
            },
        });
    }

    logPerformance<T>(name: string, cb: () => Promise<T>) {
        return logPerformance(name, cb, this.extraInfo);
    }
}

export async function logPerformance<T>(name: string, cb: () => Promise<T>, extraInfo?: object) {
    const start = new Date().getTime();
    const result = await cb();
    const durationInMs = new Date().getTime() - start;
    const args = { durationInMs, ...extraInfo };
    logInfo(`[${SCW_SERVICE} - ${name} - TIME] - ${beautify(args)}`, addCommonKeysToLog({ args }));
    return result;
}

function beautify(json: any) {
    return json != null ? JSON.stringify(json, null, 2) : json;
}

export function addCommonKeysToLog(obj: any) {
    return {
        ...obj,
        service: SCW_SERVICE,
    };
}
