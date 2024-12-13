import { createCrossmint } from "@crossmint/server-sdk";
import { CrossmintWalletServerSDK } from "@crossmint/wallet-sdk";

const serverApiKey =
    "sk_development_28eGydafo266rNpVdnxWPszyQDKG171ef2MF5GQTrVLXhbZdUnTc6LP2m9V2EAWXX8Loqdcoxhm3SV6T2cSa5CfZPBY6MTpPpb9q189wwi9oL6qerY3oUY5sFpNiZxWW9CDDY8rgut5jibVF2sF7x9Yytfx8rtNCcG5iMC3dt2pU5ZZaHYBphDiYp1XzH6D6DWt3ZcLTX77C5iSCg1TusZU";

//EXAMPLE_SERVER_USAGE
export async function NewServerWalletSDKComponent() {
    const crossmint = createCrossmint({ apiKey: serverApiKey });
    const walletSDK = CrossmintWalletServerSDK.from(crossmint);

    const wallet = await walletSDK.getWalletByLocator("0x85E77E827261ee50f8dEE1934F04A85758c86e51");
    console.log("wallet", wallet);

    return (
        <div>
            Wallet from a <strong>server</strong> component: {wallet?.address}
        </div>
    );
}
