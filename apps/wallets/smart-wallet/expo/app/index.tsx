import { useCrossmint, useWallet } from "@crossmint/client-sdk-react-native-ui";
import { useEffect, useMemo } from "react";
import { Button, Text, View } from "react-native";
import { privateKeyToAccount } from "viem/accounts";

const jwt =
    "eyJhbGciOiJSUzI1NiIsImtpZCI6InhtaW50LXNpbmdsZS0xIn0.eyJpc3MiOiJodHRwczovL3N0YWdpbmcuY3Jvc3NtaW50LmNvbSIsImlhdCI6MTc0MzE5OTkyMywiZXhwIjoxNzQzMjg2MzIzLCJzdWIiOiI2MTBiY2ExMi1mODFiLTRkYWYtOGFkMy1mZTZkMWJjYmJjYTkiLCJhdWQiOiIzNWNjY2Q3OC01MDU2LTQ1MmQtYjc0OS1kNTYzYTFlMTUyMWYifQ.FDvaUfmFGQOzXRzf0ZQz4VUGeYL1N675PRJvCfX4Mh-CcCYIGpXhm_W31OoV5d9YaV6VUxxnQ_ymmZxXf8a9oV2OHNJkq3QQ8ua91OACzrZQbu0jbrA7WLNZETaQuCKtmUNno2z0hU7VULqZ7e_WT0Q_tE5299Up0OAIxwlFhcXtPrBq14WrC9_AWyt4PQEv8CUQ9bJDUukDkXV0-54cpP-tHgLKGxTGAkJll4Qp6jQ6563NQR-9QZxXfI8TsBsMXdJ23_rbDdor9cHe577f6E6dblsUQpK-k_fmplnyYBA7XXc9Aimw5wUG7yKpGbyx47y_mVebNnB4zbX60dQJbw";

export default function Index() {
    const { crossmint, setJwt } = useCrossmint();
    const { wallet, error, getOrCreateWallet } = useWallet();

    useEffect(() => {
        setJwt(jwt);
    }, []);

    function initWallet() {
        const pk = "0xadc201c0d4f9dd2cfff282e2a4815faa722f11eabd91160846fa75ea94e52ff9";
        console.log("pk", pk);
        const account = privateKeyToAccount(pk);
        console.log("account", account, crossmint.jwt);
        const a = getOrCreateWallet({
            type: "evm-smart-wallet",
            args: {
                chain: "base-sepolia",
                adminSigner: {
                    type: "evm-keypair",
                    address: account.address,
                    signer: {
                        type: "viem_v2",
                        account,
                    },
                },
            },
        });
        console.log("a", a);
    }

    async function makeTransaction() {
        if (wallet == null) {
            console.log("Wallet not initialized");
            return;
        }
        const transaction = await wallet.sendTransaction({
            to: "0x0000000000000000000000000000000000000042",
            data: "0xdeadbeef",
            value: BigInt(0),
        });
        console.log("tx", transaction);
    }

    const walletAddress = useMemo(() => wallet?.getAddress(), [wallet]);

    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <Text>Wallet: {walletAddress}</Text>
            <Text>Error: {error}</Text>
            <Button title="Init Wallet" onPress={() => initWallet()} />
            <Button title="Make Transaction" onPress={() => makeTransaction()} />
        </View>
    );
}
