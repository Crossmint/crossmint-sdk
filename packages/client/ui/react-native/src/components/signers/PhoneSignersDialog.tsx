import type { MutableRefObject } from "react";
import { View, StyleSheet, Dimensions, Modal, TouchableOpacity, Text } from "react-native";
import type { UIConfig } from "@crossmint/common-sdk-base";
import { PhoneIcon, Smartphone, X } from "lucide-react-native";
import { BaseConfirmation } from "./BaseConfirmation";
import { BaseCodeInput } from "./BaseCodeInput";
import { theme } from "../../styles/theme";

interface PhoneSignersDialogProps {
    phone?: string;
    open: boolean;
    setOpen: (open: boolean) => void;
    step: "initial" | "otp";
    onSubmitOTP: (token: string) => Promise<void>;
    onResendOTPCode: () => Promise<void>;
    onSubmitPhone: () => Promise<void>;
    rejectRef: MutableRefObject<((error: Error) => void) | undefined>;
    appearance?: UIConfig;
}

const { width: screenWidth } = Dimensions.get("window");

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
    function handleOnCancel() {
        if (open) {
            rejectRef.current?.(new Error("User cancelled"));
            setOpen(false);
        }
    }

    const dynamicStyles = StyleSheet.create({
        modalOverlay: {
            flex: 1,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
        },
        modalContainer: {
            backgroundColor: appearance?.colors?.background || theme["cm-background-primary"],
            borderRadius: appearance?.borderRadius || 12,
            padding: 32,
            width: Math.min(screenWidth - 32, 400),
            maxHeight: "80%",
            position: "relative",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
        },
        closeButton: {
            position: "absolute",
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: appearance?.colors?.inputBackground || theme["cm-muted-primary"],
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
        },
    });

    if (!open) {
        return null;
    }

    return (
        <Modal
            visible={open}
            transparent={true}
            animationType="fade"
            onRequestClose={handleOnCancel}
            statusBarTranslucent={true}
        >
            <View style={dynamicStyles.modalOverlay}>
                <View style={dynamicStyles.modalContainer}>
                    <TouchableOpacity
                        style={dynamicStyles.closeButton}
                        onPress={handleOnCancel}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <X size={16} color={appearance?.colors?.textSecondary || theme["cm-text-secondary"]} />
                    </TouchableOpacity>

                    {step === "initial" ? (
                        <BaseConfirmation
                            contactInfo={phone ?? ""}
                            contactType="phone"
                            icon={
                                <PhoneIcon
                                    size={22}
                                    color={appearance?.colors?.textPrimary || theme["cm-text-primary"]}
                                />
                            }
                            onConfirm={onSubmitPhone}
                            onCancel={handleOnCancel}
                            appearance={appearance}
                        />
                    ) : (
                        <BaseCodeInput
                            contactInfo={phone ?? ""}
                            contactType="phone"
                            icon={
                                <View
                                    style={{
                                        backgroundColor: appearance?.colors?.accent || theme["cm-accent"],
                                        borderRadius: 999,
                                        padding: 12,
                                    }}
                                >
                                    <Smartphone
                                        size={22}
                                        color={appearance?.colors?.background || theme["cm-background-primary"]}
                                    />
                                </View>
                            }
                            title="Check your phone"
                            description={
                                <Text>
                                    A temporary login code has been sent via SMS to{" "}
                                    <Text style={{ fontWeight: "bold" }}>{phone}</Text>
                                </Text>
                            }
                            helpText={`Can't receive the SMS? Check your phone number.\nSome messages may take several minutes to arrive.`}
                            onSubmitOTP={onSubmitOTP}
                            onResendCode={onResendOTPCode}
                            appearance={appearance}
                            otpLength={10}
                            keyboardType="number-pad"
                            autoComplete="sms-otp"
                            textContentType="oneTimeCode"
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}
