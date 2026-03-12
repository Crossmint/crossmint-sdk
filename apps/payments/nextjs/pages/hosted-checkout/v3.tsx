import { CrossmintHostedCheckout } from "@crossmint/client-sdk-react-ui";
import { HostedCheckoutV3ClientProviders } from "../../components/hosted-v3/HostedCheckoutV3ClientProviders";
import type { CrossmintHostedCheckoutV3ButtonTheme, Locale } from "@crossmint/client-sdk-base";

const LOCALE: Locale = "en-US";

export default function HostedCheckoutV3Page() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "start",
            }}
        >
            <HostedCheckoutV3ClientProviders>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        width: "100%",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "start",
                        }}
                    >
                        {createCrossmintButtonSection("light", LOCALE, true, true)}
                        {createCrossmintButtonSection("dark", LOCALE, true, true)}
                        {createCrossmintButtonSection("crossmint", LOCALE, true, true)}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "start",
                        }}
                    >
                        {createCrossmintButtonSection("light", LOCALE, true, false)}
                        {createCrossmintButtonSection("dark", LOCALE, true, false)}
                        {createCrossmintButtonSection("crossmint", LOCALE, true, false)}
                    </div>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "start",
                        }}
                    >
                        {createCrossmintButtonSection("light", LOCALE, false, true)}
                        {createCrossmintButtonSection("dark", LOCALE, false, true)}
                        {createCrossmintButtonSection("crossmint", LOCALE, false, true)}
                    </div>
                </div>
                <div style={{ marginTop: "40px", textAlign: "center" }}>
                    <h2 style={{ marginBottom: "16px" }}>Token / Memecoin & Onramp (tokenLocator)</h2>
                    <div style={{ display: "flex", gap: "20px", justifyContent: "center" }}>
                        {createTokenButtonSection("crossmint", true, false)}
                        {createTokenButtonSection("dark", false, true)}
                    </div>
                </div>
            </HostedCheckoutV3ClientProviders>
        </div>
    );
}

function createCrossmintButtonSection(
    buttonTheme: CrossmintHostedCheckoutV3ButtonTheme,
    locale: Locale,
    cryptoEnabled: boolean,
    fiatEnabled: boolean
) {
    return (
        <div
            style={{
                backgroundColor: buttonTheme === "light" ? "black" : "white",
                width: "100%",
                display: "flex",
                justifyContent: "center",
                padding: "20px",
            }}
        >
            <CrossmintHostedCheckout
                locale={locale}
                lineItems={{
                    collectionLocator: "crossmint:206b3146-f526-444e-bd9d-0607d581b0e9",
                    callData: {
                        totalPrice: "0.001",
                        quantity: 1,
                    },
                }}
                payment={{
                    crypto: {
                        enabled: cryptoEnabled,
                    },
                    fiat: {
                        enabled: fiatEnabled,
                    },
                    defaultMethod: fiatEnabled ? "fiat" : "crypto",
                }}
                appearance={{
                    theme: {
                        button: buttonTheme,
                    },
                }}
            />
        </div>
    );
}

const TOKEN_LOCATOR = "solana:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const RECEIPT_EMAIL = "[EMAIL_ADDRESS]";
const WALLET_ADDRESS = "[WALLET_ADDRESS]";

function createTokenButtonSection(
    buttonTheme: CrossmintHostedCheckoutV3ButtonTheme,
    fiatEnabled: boolean,
    cryptoEnabled: boolean
) {
    return (
        <div
            style={{
                backgroundColor: buttonTheme === "light" ? "black" : "white",
                display: "flex",
                justifyContent: "center",
                padding: "20px",
            }}
        >
            <CrossmintHostedCheckout
                lineItems={{
                    tokenLocator: TOKEN_LOCATOR,
                    executionParameters: {
                        mode: "exact-in",
                        amount: "5",
                    },
                }}
                payment={{
                    fiat: { enabled: fiatEnabled },
                    crypto: { enabled: cryptoEnabled },
                    defaultMethod: fiatEnabled ? "fiat" : "crypto",
                    receiptEmail: RECEIPT_EMAIL,
                }}
                recipient={{ walletAddress: WALLET_ADDRESS }}
                appearance={{ theme: { button: buttonTheme } }}
            />
        </div>
    );
}
