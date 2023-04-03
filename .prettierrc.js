module.exports = {
    printWidth: 120,
    trailingComma: "es5",
    tabWidth: 4,
    semi: true,
    singleQuote: false,
    importOrder: ["<THIRD_PARTY_MODULES>", "^@crossmint/(.*)$", "^[./]"],
    importOrderSeparation: true,
    importOrderSortSpecifiers: true,
    importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
    plugins: [require("@trivago/prettier-plugin-sort-imports")],
};
