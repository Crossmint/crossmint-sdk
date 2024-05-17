import { logError, logInfo } from "@/services/logging";

import { SCW_SERVICE } from "./constants";

export class LoggerWrapper {
    constructor(className: string) {
        return new Proxy(this, {
            get: (target: any, propKey: PropertyKey, receiver: any) => {
                const origMethod = target[propKey];
                const identifierTag = `[${SCW_SERVICE} - ${className} - ${String(propKey)}]`;

                if (typeof origMethod === "function") {
                    return (...args: any[]) => {
                        logInfo(`${identifierTag} input - ${beautify(args)}`, decorateObjToLog({ args }));
                        const result = origMethod.apply(target, args);
                        if (result instanceof Promise) {
                            return result
                                .then((res: any) => {
                                    logInfo(`${identifierTag} output - ${beautify(res)}`, decorateObjToLog({ res }));
                                    return res;
                                })
                                .catch((err: any) => {
                                    logError(`${identifierTag} threw_error - ${err}`, decorateObjToLog({ err }));
                                    throw err;
                                });
                        } else {
                            logInfo(`${identifierTag} output - ${beautify(result)}`, decorateObjToLog({ res: result }));
                            return result;
                        }
                    };
                }
                return Reflect.get(target, propKey, receiver);
            },
        });
    }
}

export async function logPerformance<T>(name: string, cb: () => Promise<T>, extraInfo?: object) {
    const start = new Date().getTime();
    const result = await cb();
    const durationInMs = new Date().getTime() - start;
    logInfo(`${name} - TIME`, { durationInMs, ...extraInfo });
    return result;
}

function beautify(json: any) {
    return json != null ? JSON.stringify(json, null, 2) : json;
}

function decorateObjToLog(obj: any) {
    return {
        ...obj,
        service: SCW_SERVICE,
    };
}
