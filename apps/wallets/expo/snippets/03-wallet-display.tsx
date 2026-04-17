import { View, Text, TouchableOpacity } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useWallet } from "@crossmint/client-sdk-react-native-ui";
import { useState } from "react";

export function WalletDisplay() {
    const { wallet, status } = useWallet();
    const [copied, setCopied] = useState(false);

    const copyAddress = async () => {
        if (wallet == null) return;
        await Clipboard.setStringAsync(wallet.address);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (status === "in-progress") {
        return <Text style={{ color: "#6B7280" }}>Fetching wallet...</Text>;
    }

    if (wallet == null) {
        return <Text style={{ color: "#6B7280" }}>No wallet connected</Text>;
    }

    return (
        <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: "#6B7280" }}>Address</Text>
                <TouchableOpacity onPress={copyAddress} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text
                        style={{ fontWeight: "500" }}
                    >{`${wallet.address.slice(0, 6)}...${wallet.address.slice(-6)}`}</Text>
                    <Text style={{ fontSize: 11, color: copied ? "#13b601" : "#6B7280" }}>
                        {copied ? "Copied!" : "Copy"}
                    </Text>
                </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: "#6B7280" }}>Chain</Text>
                <Text style={{ fontWeight: "500" }}>{wallet.chain}</Text>
            </View>
        </View>
    );
}
