import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
    preset: "ts-jest",
    testEnvironment: "jest-environment-jsdom",
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
    },
    globals: {
        'ts-jest': {
            useESM: true,
        },
    },
};

export default jestConfig;