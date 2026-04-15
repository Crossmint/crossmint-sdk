import { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { TOKENS } from "../constants/tokens";

export function BalanceCard({ wallet }: { wallet: any }) {
    const [balances, setBalances] = useState<Record<string, string>>({});

    const refreshBalance = async () => {
        if (wallet == null) return;
        const res = await wallet.balances([...TOKENS]);
        const map: Record<string, string> = {};
        map[res.usdc.symbol] = res.usdc.amount;
        for (const t of res.tokens) {
            map[t.symbol] = t.amount;
        }
        setBalances(map);
    };

    const handleFund = async () => {
        if (wallet == null) return;
        await wallet.stagingFund(10);
        await refreshBalance();
    };

    return (
        <View style={{ backgroundColor: "#F7F8FA", borderRadius: 12, padding: 16 }}>
            <Text style={{ fontSize: 12, color: "#6B7280", textTransform: "uppercase" }}>Balances</Text>
            {TOKENS.map((token) => (
                <View key={token} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                    <Text style={{ color: "#6B7280" }}>{token.toUpperCase()}</Text>
                    <Text style={{ fontWeight: "500" }}>{balances[token] ?? "—"}</Text>
                </View>
            ))}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                <TouchableOpacity
                    style={{ backgroundColor: "#13b601", padding: 10, borderRadius: 8, flex: 1, alignItems: "center" }}
                    onPress={handleFund}
                >
                    <Text style={{ color: "#fff", fontWeight: "500" }}>Fund 10 USDXM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={{
                        backgroundColor: "#fff",
                        padding: 10,
                        borderRadius: 8,
                        flex: 1,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#E5E7EB",
                    }}
                    onPress={refreshBalance}
                >
                    <Text style={{ fontWeight: "500" }}>Refresh</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
