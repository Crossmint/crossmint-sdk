import type { MutableRefObject } from "react";
import { Modal, View, Text, StyleSheet } from "react-native";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { PhoneOTPInput } from "./PhoneOTPInput";
import { PhoneConfirmation } from "./PhoneConfirmation";

interface PhoneSignersDialogProps {
    phone: string;
    open: boolean;
    setOpen: (open: boolean) => void;
    step: "initial" | "otp";
    onSubmitOTP: (token: string) => Promise<void>;
    onResendOTPCode: () => Promise<void>;
    onSubmitPhone: () => Promise<void>;
    rejectRef: MutableRefObject<((error: Error) => void) | undefined>;
    appearance?: UIConfig;
}

export function PhoneSignersDialog({
    phone,
    open,
    setOpen,
    step,
    onSubmitOTP,
    onResendOTPCode,
    onSubmitPhone,
    rejectRef,
    appearance,
}: PhoneSignersDialogProps) {
    if (phone == null) {
        throw new Error("Phone is required");
    }

    function handleOnCancel() {
        if (open) {
            rejectRef.current?.(new Error());
            setOpen(false);
        }
    }

    const backgroundColor = appearance?.colors?.background || "#FFFFFF";

    return (
        <Modal visible={open} transparent={true} animationType="fade" onRequestClose={handleOnCancel}>
            <View style={styles.overlay}>
                <View
                    style={[
                        styles.container,
                        {
                            backgroundColor,
                            borderRadius: appearance?.borderRadius || 12,
                        },
                    ]}
                >
                    {step === "initial" ? (
                        <View style={styles.initialStep}>
                            <Text style={[styles.title, { color: appearance?.colors?.textPrimary || "#000000" }]}>
                                Confirm it's you
                            </Text>
                            <Text style={[styles.subtitle, { color: appearance?.colors?.textSecondary || "#666666" }]}>
                                You're using this wallet for the first time on this device. Click 'Send code' to get a
                                one-time verification code via SMS.
                            </Text>
                        </View>
                    ) : null}

                    {step === "otp" ? (
                        <PhoneOTPInput
                            phone={phone}
                            onSubmitOTP={onSubmitOTP}
                            onResendCode={onResendOTPCode}
                            appearance={appearance}
                        />
                    ) : (
                        <PhoneConfirmation
                            phone={phone}
                            onConfirm={onSubmitPhone}
                            onCancel={handleOnCancel}
                            appearance={appearance}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    container: {
        width: "100%",
        maxWidth: 448,
        paddingTop: 40,
        paddingBottom: 30,
        paddingHorizontal: 24,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    initialStep: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 16,
    },
    subtitle: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 12,
    },
});
