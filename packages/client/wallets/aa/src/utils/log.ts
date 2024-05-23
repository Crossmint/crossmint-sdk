import { v4 as uuidv4 } from "uuid";

import { logError, logInfo } from "../services/logging";
import { SCW_SERVICE } from "./constants";
import { isLocalhost } from "./helpers";

export class LoggerWrapper {
    constructor(className: string, private extraInfo = {}, private logIdempotencyKey = uuidv4()) {
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
        logInfoIfNotInLocalhost(
            `${identifierTag} input - ${beautify(args)} - extra_info - ${beautify(
                this.extraInfo
            )} - log_idempotency_key - ${this.logIdempotencyKey}`,
            { args, ...this.extraInfo, logIdempotencyKey: this.logIdempotencyKey }
        );
    }

    private logOutput(res: object, identifierTag: string) {
        logInfoIfNotInLocalhost(
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
    const start = new Date().getTime();
    const result = await cb();
    const durationInMs = new Date().getTime() - start;
    const args = { durationInMs, ...extraInfo };
    logInfoIfNotInLocalhost(`[${SCW_SERVICE} - ${name} - TIME] - ${beautify(args)}`, { args });
    return result;
}

export function logInputOutput(fn: Function, functionName: string) {
    return function (this: any, ...args: any[]) {
        const identifierTag = `[${SCW_SERVICE} - function: ${functionName}]`;
        logInfoIfNotInLocalhost(`${identifierTag} input: ${beautify(args)}`, { args });

        try {
            const result = fn.apply(this, args);
            if (result instanceof Promise) {
                return result
                    .then((res) => {
                        logInfoIfNotInLocalhost(`${identifierTag} output: ${beautify(res)}`, { res });
                        return res;
                    })
                    .catch((err) => {
                        logError(`${identifierTag} threw_error: ${beautify(err)}`, { err });
                        throw err;
                    });
            } else {
                logInfoIfNotInLocalhost(`${identifierTag} output: ${beautify(result)}`, { res: result });
                return result;
            }
        } catch (err) {
            logError(`${identifierTag} threw_error: ${beautify(err)}`, { err });
            throw err;
        }
    };
}

function beautify(json: any) {
    try {
        return json != null ? JSON.stringify(json, null, 2) : json;
    } catch (error) {
        return stringifyAvoidingCircular(json);
    }
}

function stringifyAvoidingCircular(json: any) {
    // stringify an object, avoiding circular structures
    // https://stackoverflow.com/a/31557814
    const simpleObject: { [key: string]: any } = {};
    for (var prop in json) {
        if (!json.hasOwnProperty(prop)) {
            continue;
        }
        if (typeof json[prop] == "object") {
            continue;
        }
        if (typeof json[prop] == "function") {
            continue;
        }
        simpleObject[prop] = json[prop];
    }
    return JSON.stringify(simpleObject, null, 2); // returns cleaned up JSON
}

function logInfoIfNotInLocalhost(message: string, context?: object) {
    if (isLocalhost()) {
        return;
    }
    logInfo(message, context);
}
