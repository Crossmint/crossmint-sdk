import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { useCrossmintAuth } from "@crossmint/client-sdk-react-native-ui";

export function LoginScreen() {
    const { crossmintAuth, createAuthSession } = useCrossmintAuth();
    const [email, setEmail] = useState("");
    const [emailId, setEmailId] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);

    const sendOtp = async () => {
        if (!crossmintAuth) return;
        const res = await crossmintAuth.sendEmailOtp(email);
        setEmailId(res.emailId);
        setOtpSent(true);
    };

    const verifyOtp = async () => {
        if (!crossmintAuth) return;
        const secret = await crossmintAuth.confirmEmailOtp(email, emailId, otp);
        await createAuthSession(secret);
    };

    return (
        <View style={{ padding: 20, justifyContent: "center", flex: 1 }}>
            <Text style={{ fontSize: 24, marginBottom: 20, textAlign: "center" }}>Sign In</Text>
            <TextInput
                style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, marginBottom: 12, borderRadius: 8 }}
                placeholder="Email address"
                value={email}
                onChangeText={setEmail}
                editable={!otpSent}
                autoCapitalize="none"
                keyboardType="email-address"
            />
            {!otpSent ? (
                <TouchableOpacity
                    style={{ backgroundColor: "#13b601", padding: 14, borderRadius: 8, alignItems: "center" }}
                    onPress={sendOtp}
                >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>Send Code</Text>
                </TouchableOpacity>
            ) : (
                <>
                    <TextInput
                        style={{ borderWidth: 1, borderColor: "#ccc", padding: 12, marginBottom: 12, borderRadius: 8 }}
                        placeholder="Enter verification code"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                    />
                    <TouchableOpacity
                        style={{ backgroundColor: "#13b601", padding: 14, borderRadius: 8, alignItems: "center" }}
                        onPress={verifyOtp}
                    >
                        <Text style={{ color: "#fff", fontWeight: "600" }}>Verify</Text>
                    </TouchableOpacity>
                </>
            )}
        </View>
    );
}
