const { PHASE_PRODUCTION_BUILD } = require("next/constants");

module.exports = function (phase, ...args) {
    return {
        reactStrictMode: true,
        basePath: phase === PHASE_PRODUCTION_BUILD ? "/crossmint-client-sdk/example" : "",
    };
};
