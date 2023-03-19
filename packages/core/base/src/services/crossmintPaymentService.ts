export function crossmintPaymentService() {
    async function getOrder(orderIdentifier: string) {
        return await MOCK_fetchOrder(orderIdentifier);
    }

    return {
        getOrder,
    };
}

// TODO: Remove once we have a real API
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function MOCK_fetchOrder(orderIdentifier: string) {
    await sleep(1000);
    return {
        orderIdentifier: "0aa4229f-4a55-4d9c-b39e-6a92cd6dfecb",
        clientParameters: {
            clientId: "94273c86-b888-4734-a851-6464c7cce707",
            paymentMethod: "sol",
            clientName: "client-sdk-react-ui",
            locale: "en-US",
            currency: "usd",
            clientVersion: "0.2.6-alpha.3",
            mintConfig: '{"type":"candy-machine","quantity":1,"hsp":true}',
            multiMintArgs: [
                {
                    type: "candy-machine",
                    quantity: 1,
                    hsp: true,
                },
            ],
            mintArgs: {
                type: "candy-machine",
                quantity: 1,
                hsp: true,
            },
            rawQueryString:
                "clientId=94273c86-b888-4734-a851-6464c7cce707&paymentMethod=sol&clientName=client-sdk-react-ui&locale=en-US&currency=USD&clientVersion=0.2.6-alpha.3&mintConfig=%7B%22type%22%3A%22candy-machine%22%2C%22quantity%22%3A1%2C%22hsp%22%3Atrue%7D",
        },
        buyer: {
            type: "CROSSMINT_USER",
            id: {
                $oid: "64172a757c099e332c60a9c1",
            },
            mintTo: "6rXBWMF9vHh8i9Bm4ti1PABtzZrnLyhY67y7NiJaQtmW",
            email: "thugchickt@gmail.com",
        },
        items: [
            {
                chain: "solana",
                clientId: "94273c86-b888-4734-a851-6464c7cce707",
                metadata: {
                    title: "Cyberpunk",
                    description: "Demo collection showcasing how easy it is to purchase NFTs with Crossmint.",
                    imageUrl: "https://i.imgur.com/5ScaZQM.png",
                },
                mintParameters: {
                    paymentCurrency: "sol",
                    mintArgs: {
                        type: "candy-machine",
                        quantity: 1,
                        hsp: true,
                        mintTo: "6rXBWMF9vHh8i9Bm4ti1PABtzZrnLyhY67y7NiJaQtmW",
                    },
                },
                fulfillmentOperation: {
                    type: "TRANSACTION",
                },
            },
        ],
        createdAt: 1679239864544,
        __v: 0,
    };
}
