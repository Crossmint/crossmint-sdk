module.exports = {
    root: true,
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: ["./tsconfig.eslint.json", "./packages/*/*/tsconfig.json"],
        // https://github.com/typescript-eslint/typescript-eslint/issues/251#issuecomment-567365174
        tsconfigRootDir: __dirname,
    },
    plugins: ["@typescript-eslint"],
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    rules: {
        // Add or override any rules you'd like here
    },
    env: {
        browser: true,
        node: true,
        es6: true,
    },
    overrides: [
        {
            files: ["**/*.test.ts"],
            rules: {
                "@typescript-eslint/no-explicit-any": "off",
                "no-global-assign": "off",
                "@typescript-eslint/no-empty-function": "off",
            },
        },
    ],
};
