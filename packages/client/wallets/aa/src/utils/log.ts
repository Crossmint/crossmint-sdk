import { logError, logInfo } from "@/services/logging";
import { v4 as uuidv4 } from "uuid";

import { SCW_SERVICE } from "./constants";
import { isLocalhost } from "./helpers";

export class LoggerWrapper {
    constructor(className: string, private extraInfo = {}, private logIdempotencyKey = uuidv4()) {
        if (isLocalhost()) {
            return;
        }

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
            { args, ...this.extraInfo, logIdempotencyKey: this.logIdempotencyKey }
        );
    }

    private logOutput(res: object, identifierTag: string) {
        logInfo(
            `${identifierTag} output - ${beautify(res)} - extra_info - ${beautify(
                this.extraInfo
            )} - log_idempotency_key - ${this.logIdempotencyKey}`,
            {
                res,
                ...this.extraInfo,
                logIdempotencyKey: this.logIdempotencyKey,
            }
        );
    }

    private logError(err: object, identifierTag: string) {
        logError(
            `${identifierTag} threw_error - ${err} - extra_info - ${beautify(this.extraInfo)} - log_idempotency_key - ${
                this.logIdempotencyKey
            }`,
            { err, ...this.extraInfo }
        );
    }

    protected logPerformance<T>(name: string, cb: () => Promise<T>) {
        return logPerformance(name, cb, this.extraInfo);
    }
}

export async function logPerformance<T>(name: string, cb: () => Promise<T>, extraInfo?: object) {
    if (isLocalhost()) {
        return cb();
    }

    const start = new Date().getTime();
    const result = await cb();
    const durationInMs = new Date().getTime() - start;
    const args = { durationInMs, ...extraInfo };
    logInfo(`[${SCW_SERVICE} - ${name} - TIME] - ${beautify(args)}`, { args });
    return result;
}

export function logInputOutput(fn: Function, functionName: string) {
    if (isLocalhost()) {
        return fn;
    }

    return function (this: any, ...args: any[]) {
        const identifierTag = `[${SCW_SERVICE} - function: ${functionName}]`;
        logInfo(`${identifierTag} input: ${beautify(args)}`, { args });

        try {
            const result = fn.apply(this, args);
            if (result instanceof Promise) {
                return result
                    .then((res) => {
                        logInfo(`${identifierTag} output: ${beautify(res)}`, { res });
                        return res;
                    })
                    .catch((err) => {
                        logError(`${identifierTag} threw_error: ${beautify(err)}`, { err });
                        throw err;
                    });
            } else {
                logInfo(`${identifierTag} output: ${beautify(result)}`, { res: result });
                return result;
            }
        } catch (err) {
            logError(`${identifierTag} threw_error: ${beautify(err)}`, { err });
            throw err;
        }
    };
}

function beautify(json: any) {
    return json != null ? JSON.stringify(json, null, 2) : json;
}
