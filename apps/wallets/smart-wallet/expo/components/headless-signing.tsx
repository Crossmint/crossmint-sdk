import { useAuth, useCrossmint, useWallet, useWalletEmailSigner } from "@crossmint/client-sdk-react-native-ui";
import { useState } from "react";
import { Button, Text, View, TextInput, Alert, StyleSheet } from "react-native";

export function HeadlessSigning() {
    const { user } = useAuth();
    const { experimental_customAuth } = useCrossmint();
    const { getOrCreateWallet } = useWallet();
    const loggedInUserEmail = experimental_customAuth?.email ?? null;
    const { needsAuth, sendEmailWithOtp, verifyOtp, reject } = useWalletEmailSigner();

    const [isLoading, setIsLoading] = useState<boolean>(false);

    // Email signer states
    const [otp, setOtp] = useState("");
    const [uiError, setUiError] = useState<string | null>(null);

    const handleAction = async (action: () => Promise<any> | void) => {
        setIsLoading(true);
        setUiError(null);
        try {
            await action();
        } catch (e: any) {
            console.error(e);
            const message = e.message || "An unexpected error occurred.";
            setUiError(message);
            Alert.alert("Error", message);
        } finally {
            setIsLoading(false);
        }
    };

    async function initWallet() {
        if (user == null) {
            console.log("User not logged in");
            return;
        }
        setIsLoading(true);
        try {
            await getOrCreateWallet({ chain: "base-sepolia", signer: { type: "email" } });
        } catch (error) {
            console.error("Error initializing wallet:", error);
        } finally {
            setIsLoading(false);
        }
    }

    const handleSendOtpEmail = async () => {
        if (typeof loggedInUserEmail !== "string") {
            Alert.alert("Error", "User email is not available.");
            return;
        }

        await handleAction(sendEmailWithOtp);
    };

    const handleVerifyOtpInput = async () => {
        if (!otp || !verifyOtp) {
            Alert.alert("Error", "Please enter the OTP and ensure email signer is available.");
            return;
        }
        await handleAction(async () => {
            await verifyOtp(otp);
            setOtp("");
        });
    };
    return (
        <View>
            <Text>Headless Signing Component</Text>
            <Text>Needs OTP Auth: {needsAuth ? "Yes" : "No"}</Text>
            {uiError && <Text style={styles.errorText}>Last Action Error: {uiError}</Text>}
            {user && <Button title="Init Wallet" onPress={initWallet} disabled={isLoading} />}

            {needsAuth && (
                <View style={styles.section}>
                    <Text style={{ fontWeight: "bold", marginBottom: 10 }}>Email OTP Verification (required)</Text>
                    <Button title="Send OTP Email" onPress={handleSendOtpEmail} disabled={loggedInUserEmail == null} />
                    <TextInput
                        placeholder="Enter OTP from Email"
                        value={otp}
                        onChangeText={setOtp}
                        style={styles.input}
                        keyboardType="numeric"
                        autoCapitalize="none"
                    />
                    <Button title="Verify OTP" onPress={handleVerifyOtpInput} disabled={!otp || isLoading} />
                    <Button title="Reject" onPress={() => reject(new Error("Rejected OTP"))} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 20,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        gap: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
    errorText: {
        color: "red",
        marginTop: 5,
    },
});
