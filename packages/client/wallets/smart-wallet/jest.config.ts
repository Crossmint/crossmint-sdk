import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
        // ... add other path mappings as needed
    },
    transform: {
        // '^.+\\.[tj]sx?$' to process js/ts with `ts-jest`
        // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-jest`
        "^.+\\.ts?$": [
            "ts-jest",
            {
                useESM: true,
            },
        ],
    },
    testPathIgnorePatterns: ["playwright/tests"],
    extensionsToTreatAsEsm: [".ts"],
    globals: {
        "ts-jest": {
            useESM: true,
        },
    },
};

export default jestConfig;
