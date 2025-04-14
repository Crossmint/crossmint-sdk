const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

module.exports = {
    ...config,
    resolver: {
        ...config.resolver,
        extraNodeModules: {
            ...config.resolver.extraNodeModules,
            // see https://docs.solanamobile.com/react-native/polyfill-guides/spl-token
            crypto: require.resolve("react-native-get-random-values"),
            buffer: require.resolve("buffer"),
            stream: require.resolve("stream-browserify"),
        },
        resolveRequest: (context, moduleName, platform) => {
            return context.resolveRequest(context, moduleName, platform);
        },
    },
};
