import type { JestConfigWithTsJest } from "ts-jest";

const jestConfig: JestConfigWithTsJest = {
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/dist/index.cjs",
        // ... add other path mappings as needed
    },
    transform: {
      '^.+\\.(t|j)s$': 'ts-jest',
  },
  transformIgnorePatterns: ['/node_modules/(?!@noble)'],
};

export default jestConfig;
