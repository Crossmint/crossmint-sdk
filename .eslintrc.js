module.exports = {
    root: true,
    env: {
        browser: true,
    },
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: ["./tsconfig.base.json", "./packages/*/*/tsconfig.json"],
        // https://github.com/typescript-eslint/typescript-eslint/issues/251#issuecomment-567365174
        tsconfigRootDir: __dirname,
    },
    plugins: ["@typescript-eslint", "prettier"],
    rules: {
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
    },
};
