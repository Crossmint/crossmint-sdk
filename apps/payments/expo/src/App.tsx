import "../utils/polyfills";
import { useCallback, useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
    CrossmintCheckoutProvider,
    CrossmintEmbeddedCheckout,
    CrossmintIdentityVerification,
    CrossmintProvider,
    type IdentityVerificationCredentials,
    useCrossmintCheckout,
    useIdentityVerificationCredentials,
} from "@crossmint/client-sdk-react-native-ui";
import { HarnessPanel, type HarnessEvent } from "./HarnessPanel";

type DemoMode = "checkout" | "merchant" | "standalone";

const DEMOS: { mode: DemoMode; label: string; tip: string }[] = [
    {
        mode: "checkout",
        label: "Checkout KYC",
        tip: "Embedded checkout renders the identity verification step itself, inside its own WebView.",
    },
    {
        mode: "merchant",
        label: "Merchant KYC",
        tip: 'Checkout suppresses its step with identityVerificationHandling="external" and this app mounts CrossmintIdentityVerification in its own slot.',
    },
    {
        mode: "standalone",
        label: "Standalone",
        tip: "No checkout at all: CrossmintIdentityVerification on its own, pointed at the hosted identity-verification route.",
    },
];

type EventLogger = (source: string, text: string) => void;

// Both the merchant slot and the standalone demo mount this. The panel renders every line it logs,
// so there is no console duplicate to keep in sync.
function Verification({
    credentials,
    onEvent,
    onHeight,
}: {
    credentials: IdentityVerificationCredentials;
    onEvent: EventLogger;
    onHeight: (height: number) => void;
}) {
    const log = (text: string) => onEvent("identity", text);
    return (
        <View onLayout={(event) => onHeight(event.nativeEvent.layout.height)}>
            <CrossmintIdentityVerification
                credentials={credentials}
                onReady={() => log("ready")}
                onComplete={({ status }) => log(`completed status=${status}`)}
                onCancel={() => log("cancelled")}
                onError={({ retriable, reason, message }) =>
                    log(`error reason=${reason} retriable=${retriable} ${message}`)
                }
            />
        </View>
    );
}

function CheckoutDemo({
    orderId,
    clientSecret,
    external,
    credentials,
    onEvent,
    onCheckoutHeight,
    onIdentityHeight,
}: {
    orderId: string;
    clientSecret: string;
    external: boolean;
    credentials: IdentityVerificationCredentials | undefined;
    onEvent: EventLogger;
    onCheckoutHeight: (height: number) => void;
    onIdentityHeight: (height: number) => void;
}) {
    const { order } = useCrossmintCheckout();

    const phase = order?.phase;
    // Cast: the Order type is a hand-kept mirror whose payment status enum has no requires-kyc,
    // which is the status the backend sits at while it demands verification. Phase alone never
    // names that moment, it just says "payment".
    const paymentStatus = (order?.payment as { status?: string } | undefined)?.status;
    useEffect(() => {
        if (phase != null) {
            onEvent("checkout", `order phase: ${phase}${paymentStatus ? ` status: ${paymentStatus}` : ""}`);
        }
    }, [phase, paymentStatus, onEvent]);

    return (
        <View>
            <View onLayout={(event) => onCheckoutHeight(event.nativeEvent.layout.height)}>
                <CrossmintEmbeddedCheckout
                    orderId={orderId}
                    clientSecret={clientSecret}
                    payment={{ crypto: { enabled: false }, fiat: { enabled: true }, defaultMethod: "fiat" }}
                    identityVerificationHandling={external ? "external" : undefined}
                />
            </View>

            {credentials != null && (
                <View
                    style={{
                        marginTop: 16,
                        borderWidth: 2,
                        borderStyle: "dashed",
                        borderColor: "#60A5FA",
                        padding: 8,
                    }}
                >
                    <Text style={{ fontSize: 11, marginBottom: 8, color: "#6B7280" }}>
                        Rendered by this app, not by checkout
                    </Text>
                    <Verification credentials={credentials} onEvent={onEvent} onHeight={onIdentityHeight} />
                </View>
            )}
        </View>
    );
}

function Harness() {
    const [mode, setMode] = useState<DemoMode>("checkout");
    // Seeded from .env because the clientSecret is a 276-character JWT. Typing that on a phone
    // keyboard is not realistic, and `adb shell input text` mangles it.
    const [orderIdInput, setOrderIdInput] = useState(process.env.EXPO_PUBLIC_DEMO_ORDER_ID ?? "");
    const [clientSecretInput, setClientSecretInput] = useState(process.env.EXPO_PUBLIC_DEMO_CLIENT_SECRET ?? "");
    const [inquiryIdInput, setInquiryIdInput] = useState(process.env.EXPO_PUBLIC_DEMO_INQUIRY_ID ?? "");
    const [mountedOrder, setMountedOrder] = useState<{ orderId: string; clientSecret: string } | null>(null);
    const [mountedInquiryId, setMountedInquiryId] = useState<string | null>(null);
    const [events, setEvents] = useState<HarnessEvent[]>([]);
    const [checkoutHeight, setCheckoutHeight] = useState<number | null>(null);
    const [identityHeight, setIdentityHeight] = useState<number | null>(null);

    const appendEvent = useCallback<EventLogger>((source, text) => {
        setEvents((prev) => [...prev, { time: new Date().toLocaleTimeString(), source, text }]);
    }, []);

    // One reset for every path out of a run. Without it a previous run's "identity completed" line
    // survives into the next one and reads as the current buyer's result.
    const startOver = useCallback(() => {
        setMountedOrder(null);
        setMountedInquiryId(null);
        setEvents([]);
        setCheckoutHeight(null);
        setIdentityHeight(null);
    }, []);

    const selectMode = (next: DemoMode) => {
        if (next === mode) {
            return;
        }
        startOver();
        setMode(next);
    };

    const standalone = mode === "standalone";
    const canMount = standalone ? inquiryIdInput.trim() !== "" : orderIdInput.trim() !== "";
    const mounted = mountedOrder != null || mountedInquiryId != null;

    // Read here rather than inside CheckoutDemo so the panel can gate on credentials arriving
    // rather than on the mode. Gating on the mode would claim the verification view is missing from
    // the moment the order mounts, through every phase before the backend demands KYC.
    const orderCredentials = useIdentityVerificationCredentials();
    const merchantCredentials = mode === "merchant" ? orderCredentials : undefined;

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 4 }}>Identity Verification Demos</Text>
            <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}>
                Mint an order with ~/dev/kyc-e2e-harness/mint-inquiry.sh and paste its values below.
            </Text>

            <View style={{ flexDirection: "row", gap: 8, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4 }}>
                {DEMOS.map(({ mode: demoMode, label }) => (
                    <TouchableOpacity
                        key={demoMode}
                        style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: mode === demoMode ? "#FFFFFF" : "transparent",
                        }}
                        onPress={() => selectMode(demoMode)}
                    >
                        <Text
                            style={{
                                textAlign: "center",
                                fontSize: 13,
                                color: mode === demoMode ? "#111827" : "#6B7280",
                            }}
                        >
                            {label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <Text style={{ fontSize: 11, color: "#6B7280", marginTop: 8 }}>
                {DEMOS.find((demo) => demo.mode === mode)?.tip}
            </Text>

            {!mounted && (
                <View style={{ gap: 8, marginTop: 16 }}>
                    {standalone ? (
                        <Field
                            label="inquiryId"
                            placeholder="inq_…"
                            value={inquiryIdInput}
                            onChangeText={setInquiryIdInput}
                        />
                    ) : (
                        <>
                            <Field label="orderId" value={orderIdInput} onChangeText={setOrderIdInput} />
                            <Field label="clientSecret" value={clientSecretInput} onChangeText={setClientSecretInput} />
                        </>
                    )}
                    <TouchableOpacity
                        disabled={!canMount}
                        style={{
                            backgroundColor: canMount ? "#111827" : "#D1D5DB",
                            borderRadius: 8,
                            paddingVertical: 12,
                        }}
                        onPress={() => {
                            if (standalone) {
                                setMountedInquiryId(inquiryIdInput.trim());
                                return;
                            }
                            setMountedOrder({
                                orderId: orderIdInput.trim(),
                                clientSecret: clientSecretInput.trim(),
                            });
                        }}
                    >
                        <Text style={{ color: "#FFFFFF", textAlign: "center" }}>Mount</Text>
                    </TouchableOpacity>
                </View>
            )}

            {mounted && (
                <TouchableOpacity style={{ marginTop: 16 }} onPress={startOver}>
                    <Text style={{ color: "#6B7280" }}>Start over</Text>
                </TouchableOpacity>
            )}

            <View style={{ marginTop: 16 }}>
                {mountedOrder != null && (
                    <CheckoutDemo
                        orderId={mountedOrder.orderId}
                        clientSecret={mountedOrder.clientSecret}
                        external={mode === "merchant"}
                        credentials={merchantCredentials}
                        onEvent={appendEvent}
                        onCheckoutHeight={setCheckoutHeight}
                        onIdentityHeight={setIdentityHeight}
                    />
                )}

                {mountedInquiryId != null && (
                    <Verification
                        credentials={{ provider: "persona", inquiryId: mountedInquiryId }}
                        onEvent={appendEvent}
                        onHeight={setIdentityHeight}
                    />
                )}
            </View>

            <HarnessPanel
                events={events}
                checkoutHeight={checkoutHeight}
                identityHeight={identityHeight}
                // Gated on something being mounted, not on credentials alone. CrossmintCheckoutProvider
                // never clears its order, so after one mount the hook keeps returning that order's
                // credentials and this row would cry EXPECTED with nothing on screen.
                expectIdentity={mountedInquiryId != null || (mountedOrder != null && merchantCredentials != null)}
            />
        </ScrollView>
    );
}

function Field({
    label,
    value,
    placeholder,
    onChangeText,
}: {
    label: string;
    value: string;
    placeholder?: string;
    onChangeText: (text: string) => void;
}) {
    return (
        <View>
            <Text style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>{label}</Text>
            <TextInput
                value={value}
                placeholder={placeholder}
                onChangeText={onChangeText}
                autoCapitalize="none"
                autoCorrect={false}
                style={{
                    borderWidth: 1,
                    borderColor: "#D1D5DB",
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 13,
                    backgroundColor: "#FFFFFF",
                }}
            />
        </View>
    );
}

export default function App() {
    return (
        <CrossmintProvider apiKey={process.env.EXPO_PUBLIC_CROSSMINT_API_KEY!}>
            <CrossmintCheckoutProvider>
                <SafeAreaView style={{ flex: 1, backgroundColor: "#F7F8FA" }}>
                    <Harness />
                </SafeAreaView>
            </CrossmintCheckoutProvider>
        </CrossmintProvider>
    );
}
