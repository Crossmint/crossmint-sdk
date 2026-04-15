import "../utils/polyfills";
import { SafeAreaView, View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-native-ui";
import { Providers } from "../snippets/01-provider-setup";
import { LoginScreen } from "../snippets/02-login-screen";
import { WalletDisplay } from "../snippets/03-wallet-display";
import { BalanceCard } from "../snippets/04-balance-card";
import { TransferForm } from "../snippets/05-transfer-form";
import { Activity } from "../snippets/06-activity";
import { Permissions } from "../snippets/07-permissions";
import { ApprovalTest } from "../snippets/08-approval-test";

function AppContent() {
    const { user, logout, status: authStatus } = useCrossmintAuth();
    const { wallet, status: walletStatus } = useWallet();

    if (authStatus === "initializing") {
        return (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: "#6B7280" }}>Initializing...</Text>
            </View>
        );
    }

    if (user == null) {
        return <LoginScreen />;
    }

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 20,
                }}
            >
                <Text style={{ fontSize: 20, fontWeight: "600" }}>Wallets Quickstart</Text>
                <TouchableOpacity onPress={logout}>
                    <Text style={{ color: "#6B7280" }}>Log out</Text>
                </TouchableOpacity>
            </View>

            {walletStatus === "in-progress" && (
                <Text style={{ color: "#6B7280", marginBottom: 16 }}>Fetching wallet...</Text>
            )}

            {walletStatus === "loaded" && wallet && (
                <View style={{ gap: 16 }}>
                    <BalanceCard />
                    <TransferForm />
                    <Activity />
                    <Permissions />
                    <ApprovalTest />
                    <View style={{ backgroundColor: "#F7F8FA", borderRadius: 12, padding: 16 }}>
                        <Text style={{ fontSize: 12, color: "#6B7280", textTransform: "uppercase", marginBottom: 8 }}>
                            Wallet Details
                        </Text>
                        <WalletDisplay />
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

export default function App() {
    return (
        <Providers>
            <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
                <AppContent />
            </SafeAreaView>
        </Providers>
    );
}
