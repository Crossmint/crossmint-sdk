import { useAuth, useCrossmint, useWallet, useWalletEmailSigner } from "@crossmint/client-sdk-react-native-ui";
import { NativeDeviceSignerKeyStorage } from "@crossmint/expo-device-signer";
import { useState } from "react";
import { Button, Text, View, TextInput, Alert, StyleSheet } from "react-native";

export function HeadlessSigning() {
    const { user } = useAuth();
    const { crossmint } = useCrossmint();
    const { createDeviceSigner, wallet } = useWallet();
    const loggedInUserEmail = user?.email ?? null;
    const { needsAuth, sendEmailWithOtp, verifyOtp, reject } = useWalletEmailSigner();

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [deviceSignerLocator, setDeviceSignerLocator] = useState<string | null>(null);

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

    async function testSign() {
        setIsLoading(true);
        setUiError(null);
        try {
            const storage = new NativeDeviceSignerKeyStorage();
            const walletAddress = wallet?.address;
            if (!walletAddress) {
                throw new Error("No wallet address available");
            }
            // If no key is mapped to this address yet, promote the pending key from initWallet
            const existingKey = await storage.getKey(walletAddress);
            console.log("[testSign] walletAddress:", walletAddress);
            console.log("[testSign] existingKey:", existingKey);
            console.log("[testSign] deviceSignerLocator:", deviceSignerLocator);
            if (existingKey == null) {
                if (!deviceSignerLocator) {
                    throw new Error("No key found. Tap 'Init Wallet' first.");
                }
                const pubKey = deviceSignerLocator.replace("device:", "");
                console.log("[testSign] calling mapAddressToKey with pubKey:", pubKey.slice(0, 20) + "...");
                await storage.mapAddressToKey(walletAddress, pubKey);
                console.log("[testSign] mapAddressToKey succeeded");
            }
            const messageB64 = btoa("crossmint device signer test");
            console.log("[testSign] calling signMessage...");
            const { r, s } = await storage.signMessage(walletAddress, messageB64);
            Alert.alert("Signed!", `r: ${r.slice(0, 20)}...\ns: ${s.slice(0, 20)}...`);
        } catch (error: any) {
            const message = error?.message ?? "Unknown error";
            setUiError(message);
            Alert.alert("Sign Error", message);
        } finally {
            setIsLoading(false);
        }
    }

    async function initWallet() {
        setIsLoading(true);
        setUiError(null);
        setDeviceSignerLocator(null);
        try {
            const descriptor = await createDeviceSigner();
            await wallet?.addSigner(descriptor.locator);
            setDeviceSignerLocator(descriptor.locator);
            Alert.alert("Device Signer Created", `Locator: ${descriptor.locator}`);
        } catch (error: any) {
            const message = error?.message ?? "Unknown error";
            setUiError(message);
            Alert.alert("Error", message);
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
            {uiError && <Text style={styles.errorText}>Error: {uiError}</Text>}
            {deviceSignerLocator && <Text style={styles.successText}>Device key: {deviceSignerLocator}</Text>}
            {user && <Button title="Init Wallet (create device key)" onPress={initWallet} disabled={isLoading} />}
            {user && <Button title="Sign Test Message (device key)" onPress={testSign} disabled={isLoading} />}

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
    successText: {
        color: "green",
        marginTop: 5,
        fontSize: 12,
    },
});
