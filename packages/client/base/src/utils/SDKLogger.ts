import { getBrowserLogger } from "../services/logging";

export class SDKLogger {
    constructor(
        private service: string,
        private logger = getBrowserLogger(service)
    ) {}

    log(message: string, ...args: any[]) {
        this.logger.logInfo(message, ...args);
    }

    warn(message: string, ...args: any[]) {
        this.logger.logWarn(message, ...args);
    }

    error(message: string, ...args: any[]) {
        this.logger.logError(message, ...args);
    }

    async logPerformance<T>(name: string, cb: () => Promise<T>, extraInfo?: object) {
        const start = new Date().getTime();
        const result = await cb();
        const durationInMs = new Date().getTime() - start;
        const args = { durationInMs, ...extraInfo, name };
        this.log(`[${name} - TIME] - ${this.beautify(args)}`, { args });
        return result;
    }

    private beautify(json: any) {
        try {
            return json != null ? JSON.stringify(json, null, 2) : json;
        } catch (error) {
            return this.stringifyAvoidingCircular(json);
        }
    }

    private stringifyAvoidingCircular(json: any) {
        // stringify an object, avoiding circular structures
        // https://stackoverflow.com/a/31557814
        const simpleObject: { [key: string]: any } = {};
        for (const prop in json) {
            if (!Object.prototype.hasOwnProperty.call(json, prop)) {
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
}
