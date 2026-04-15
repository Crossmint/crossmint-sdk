import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView } from "react-native";

export function ActivityList({ wallet }: { wallet: any }) {
    const [transfers, setTransfers] = useState<any[]>([]);

    const loadActivity = async () => {
        if (wallet == null) return;
        const res = await wallet.transfers({ tokens: "usdxm,usdc", status: "successful" });
        setTransfers(res?.data ?? []);
    };

    return (
        <View style={{ backgroundColor: "#F7F8FA", borderRadius: 12, padding: 16 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12, color: "#6B7280", textTransform: "uppercase" }}>Activity</Text>
                <TouchableOpacity onPress={loadActivity}>
                    <Text style={{ color: "#13b601", fontWeight: "500" }}>Load</Text>
                </TouchableOpacity>
            </View>
            {transfers.length === 0 && <Text style={{ color: "#6B7280", marginTop: 8 }}>No transactions yet</Text>}
            <ScrollView style={{ maxHeight: 200, marginTop: 8 }}>
                {transfers.map((tx, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 }}>
                        <Text style={{ color: "#6B7280", fontSize: 13 }}>
                            {tx.token?.symbol ?? tx.token?.locator} → {tx.recipient?.address?.slice(0, 8)}...
                        </Text>
                        <Text style={{ fontWeight: "500", fontSize: 13 }}>{tx.token?.amount}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}
