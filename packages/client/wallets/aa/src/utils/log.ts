import { logError, logInfo } from "@/services/logging";
import { v4 as uuidv4 } from "uuid";

import { SCW_SERVICE } from "./constants";

export class LoggerWrapper {
    private logIdempotencyKey: string;

    constructor(className: string, private extraInfo = {}) {
        this.logIdempotencyKey = uuidv4();

        return new Proxy(this, {
            get: (target: any, propKey: PropertyKey, receiver: any) => {
                const origMethod = target[propKey];
                const identifierTag = `[${SCW_SERVICE} - ${className} - ${String(propKey)}]`;

                if (typeof origMethod === "function") {
                    return (...args: any[]) => {
                        this.logInput(args, identifierTag);

                        const result = origMethod.apply(target, args);
                        if (result instanceof Promise) {
                            return result
                                .then((res: any) => {
                                    this.logOutput(res, identifierTag);
                                    return res;
                                })
                                .catch((err: any) => {
                                    this.logError(err, identifierTag);
                                    throw err;
                                });
                        } else {
                            this.logOutput(result, identifierTag);
                            return result;
                        }
                    };
                }
                return Reflect.get(target, propKey, receiver);
            },
        });
    }

    private logInput(args: object, identifierTag: string) {
        logInfo(
            `${identifierTag} input - ${beautify(args)} - extra_info - ${beautify(
                this.extraInfo
            )} - log_idempotency_key - ${this.logIdempotencyKey}`,
            addCommonKeysToLog({ args, ...this.extraInfo, logIdempotencyKey: this.logIdempotencyKey })
        );
    }

    private logOutput(res: object, identifierTag: string) {
        logInfo(
            `${identifierTag} output - ${beautify(res)} - extra_info - ${beautify(
                this.extraInfo
            )} - log_idempotency_key - ${this.logIdempotencyKey}`,
            addCommonKeysToLog({
                res,
                ...this.extraInfo,
                logIdempotencyKey: this.logIdempotencyKey,
            })
        );
    }

    private logError(err: object, identifierTag: string) {
        logError(
            `${identifierTag} threw_error - ${err} - extra_info - ${beautify(this.extraInfo)} - log_idempotency_key - ${
                this.logIdempotencyKey
            }`,
            addCommonKeysToLog({ err, ...this.extraInfo })
        );
    }

    protected logPerformance<T>(name: string, cb: () => Promise<T>) {
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

export function addCommonKeysToLog(obj: any) {
    return {
        ...obj,
        service: SCW_SERVICE,
    };
}

function beautify(json: any) {
    return json != null ? JSON.stringify(json, null, 2) : json;
}
