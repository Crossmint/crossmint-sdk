import { logError, logInfo } from "@/services/logging";

export class LoggerWrapper {
    constructor(className: string) {
        return new Proxy(this, {
            get: (target: any, propKey: PropertyKey, receiver: any) => {
                const origMethod = target[propKey];
                const identifierTag = `[SDK - ${className} - ${String(propKey)}]`;

                if (typeof origMethod === "function") {
                    return (...args: any[]) => {
                        logInfo(`${identifierTag} input - ${beautify(args)}`, { args });
                        const result = origMethod.apply(target, args);
                        if (result instanceof Promise) {
                            return result
                                .then((res: any) => {
                                    logInfo(`${identifierTag} output - ${beautify(res)}`, { res });
                                    return res;
                                })
                                .catch((err: any) => {
                                    logError(`${identifierTag} threw_error - ${err}`, { err });
                                    throw err;
                                });
                        } else {
                            logInfo(`${identifierTag} output - ${beautify(result)}`, { res: result });
                            return result;
                        }
                    };
                }
                return Reflect.get(target, propKey, receiver);
            },
        });
    }
}

function beautify(json: any) {
    return json != null ? JSON.stringify(json, null, 2) : json;
}
