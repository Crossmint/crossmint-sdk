import { Locale } from "../models/types";
import { NestedPaths, TypeFromPath } from "../models/system";

const enUS = {
    crossmintPayButtonService: {
        CONNECTING: "Connecting...",
        BUY_WITH_ETH: "Buy with ETH",
        BUY_WITH_SOL: "Buy with SOL",
        BUY_WITH_CREDIT_CARD: "Buy with credit card",
    },
    crossmintStatusButtonService: {
        INVALID: "Invalid clientId",
        WAITING_SUBMISSION: "Click here to setup Crossmint",
        PENDING: "Your application is under review",
        ACCEPTED: "You're good to go!",
        REJECTED: "Your application was rejected",
    },
};

const esES = {
    crossmintPayButtonService: {
        CONNECTING: "Conectando...",
        BUY_WITH_ETH: "Comprar con ETH",
        BUY_WITH_SOL: "Comprar con SOL",
        BUY_WITH_CREDIT_CARD: "Comprar con tarjeta de crédito",
    },
    crossmintStatusButtonService: {
        INVALID: "clientId inválido",
        WAITING_SUBMISSION: "Haga clic aquí para configurar Crossmint",
        PENDING: "Su solicitud está en revisión",
        ACCEPTED: "¡Está listo para usar Crossmint!",
        REJECTED: "Su solicitud fue rechazada",
    },
};

const localeMap = {
    "en-US": enUS,
    "es-ES": esES,
};

export function t<K extends NestedPaths<typeof enUS>>(wordingKey: K, locale: Locale): TypeFromPath<typeof enUS, K>  {
    const localeWording = localeMap[locale];
    return wordingKey.split(".").reduce((obj: any, i) => obj[i], localeWording);
}
