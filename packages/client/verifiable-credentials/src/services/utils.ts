const CROSSMINT_PROD_URL = "https://www.crossmint.com/api";

export function isProduction(environment: string) {
    const productionValues = ["prod", "production"];
    return productionValues.includes(environment) || environment === CROSSMINT_PROD_URL;
}
