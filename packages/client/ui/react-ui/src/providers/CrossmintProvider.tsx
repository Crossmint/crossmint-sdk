import {
    CrossmintProvider as BaseCrossmintProvider,
    initReactLogger,
    createLoggerContext,
} from "@crossmint/client-sdk-react-base";
import type { CrossmintConfig } from "@crossmint/common-sdk-base";
import packageJson from "../../package.json";
import { useMemo, type ReactNode } from "react";

export const LoggerContext = createLoggerContext();

export function CrossmintProvider({ apiKey, ...props }: CrossmintConfig & { children: ReactNode }) {
    const logger = useMemo(() => {
        return initReactLogger(apiKey, packageJson.name, packageJson.version);
    }, [apiKey]);
    return (
        <LoggerContext.Provider value={logger}>
            <BaseCrossmintProvider apiKey={apiKey} {...props} />
        </LoggerContext.Provider>
    );
}
