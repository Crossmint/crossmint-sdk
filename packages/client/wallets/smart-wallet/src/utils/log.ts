import { logError, logInfo } from "../services/logging";
import { SCW_SERVICE } from "./constants";
import { isLocalhost } from "./helpers";

export async function logPerformance<T>(name: string, cb: () => Promise<T>, extraInfo?: object) {
    const start = new Date().getTime();
    const result = await cb();
    const durationInMs = new Date().getTime() - start;
    const args = { durationInMs, ...extraInfo };
    logInfoIfNotInLocalhost(`[${SCW_SERVICE} - ${name} - TIME] - ${beautify(args)}`, { args });
    return result;
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

function logInfoIfNotInLocalhost(message: string, context?: object) {
    if (isLocalhost()) {
        console.log(message);
        return;
    }
    logInfo(message, context);
}

export function errorToJSON(error: Error | unknown) {
    const errorToLog = error instanceof Error ? error : { message: "Unknown error", name: "Unknown error" };

    if (!(errorToLog instanceof Error) && (errorToLog as any).constructor?.name !== "SyntheticBaseEvent") {
        logError("ERROR_TO_JSON_FAILED", { error: errorToLog });
        throw new Error("[errorToJSON] err is not instanceof Error nor SyntheticBaseEvent");
    }

    return JSON.parse(JSON.stringify(errorToLog, Object.getOwnPropertyNames(errorToLog)));
}
