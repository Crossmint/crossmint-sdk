export async function fundUSDC({
    jwt,
    walletAddress,
    amount,
}: {
    jwt: string;
    walletAddress: string;
    amount: number;
}) {
    try {
        const response = await fetch(`https://staging.crossmint.com/api/v1-alpha2/wallets/${walletAddress}/balances`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.EXPO_PUBLIC_CROSSMINT_API_KEY ?? "",
                Authorization: `Bearer ${jwt}`,
            },
            body: JSON.stringify({
                amount,
                token: "usdc",
            }),
        });
        if (!response.ok) {
            console.log(`Failed to get USDC: ${response.statusText}`);
        }
        console.log(
            `${amount} USDC sent to your wallet! Refresh the page to see your new balance. Balance may take a few seconds to update.`
        );
    } catch (error) {
        console.log(`Error getting test USDC: ${error}`);
    }
}
