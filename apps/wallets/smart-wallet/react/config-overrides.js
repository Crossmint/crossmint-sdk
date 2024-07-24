const webpack = require("webpack");

module.exports = function override(config) {
    if (!config.resolve) {
        config.resolve = {};
    }
    if (!config.resolve.fallback) {
        config.resolve.fallback = {};
    }
    const fallback = config.resolve.fallback || {};
    Object.assign(fallback, {
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        assert: require.resolve("assert"),
        http: require.resolve("stream-http"),
        https: require.resolve("https-browserify"),
        os: require.resolve("os-browserify"),
        url: require.resolve("url"),
    });
    config.resolve.fallback = fallback;
    config.plugins = (config.plugins || []).concat([
        new webpack.ProvidePlugin({
            process: "process/browser",
            Buffer: ["buffer", "Buffer"],
        }),
    ]);
    config.ignoreWarnings = [/Failed to parse source map/];
    config.module.rules.push({
        test: /\.(js|mjs|jsx)$/,
        enforce: "pre",
        loader: require.resolve("source-map-loader"),
        resolve: {
            fullySpecified: false,
            fallback: {
                zlib: false,
            },
        },
    });
    config.module.rules.push({
        test: /\.(ts)$/,
        loader: "babel-loader",
        options: {
            presets: ["@babel/preset-typescript"],
        },
    });
    config.resolve.fallback["path"] = require.resolve("path-browserify");

    const fileLoaderRule = getFileLoaderRule(config.module.rules);
    if (!fileLoaderRule) {
        throw new Error("File loader not found");
    }
    fileLoaderRule.exclude.push(/\.cjs$/);

    return config;
};

function getFileLoaderRule(rules) {
    for (const rule of rules) {
        if ("oneOf" in rule) {
            const found = getFileLoaderRule(rule.oneOf);
            if (found) {
                return found;
            }
        } else if (rule.test === undefined && rule.type === "asset/resource") {
            return rule;
        }
    }

    return config;
}
