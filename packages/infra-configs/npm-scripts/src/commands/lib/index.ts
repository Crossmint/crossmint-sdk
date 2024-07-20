import {
    CommandToScriptOrCustomActionMap,
    commandFromCommandToScriptOrCustomActionMap,
} from "../../utils/commandFromCommandToScriptOrCustomActionMap";

const libCommandToScriptMap: CommandToScriptOrCustomActionMap = {
    build: "cross-env NODE_OPTIONS='--max-semi-space-size=128 --max-old-space-size=8192' tsup",
    dev: "tsup --watch --clean false",
    "test:vitest": "vitest run --passWithNoTests",
    gen: "pnpm turbo gen new-library",
    "test:tsc": "tsc --noEmit",
};

export const libCommand = commandFromCommandToScriptOrCustomActionMap("lib", libCommandToScriptMap);
