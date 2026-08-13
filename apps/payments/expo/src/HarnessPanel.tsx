// Debug panel for the demos: the verification event log plus the measured heights of the two
// WebViews. Not something to copy into a real integration.
import { View, Text } from "react-native";

export type HarnessEvent = { time: string; source: string; text: string };

export function HarnessPanel({
    events,
    checkoutHeight,
    identityHeight,
    expectIdentity,
}: {
    events: HarnessEvent[];
    checkoutHeight: number | null;
    identityHeight: number | null;
    expectIdentity: boolean;
}) {
    // Heights come from onLayout on the wrapping views, which is what the platform measured after
    // the SDK applied its ui:height.changed. The web harness polls getBoundingClientRect for the
    // same reason: what the layout settled on is the thing that regressed.
    const px = (height: number | null) => (height == null ? "absent" : `${Math.round(height)}px`);

    const rows: [string, string][] = [
        ["checkout webview", px(checkoutHeight)],
        ["identity webview", px(identityHeight)],
        ["identity mounted", identityHeight != null ? "yes" : expectIdentity ? "EXPECTED, NOT MOUNTED" : "n/a"],
    ];

    return (
        <View style={{ marginTop: 16, borderRadius: 8, backgroundColor: "#111827", padding: 12 }}>
            <Text style={{ color: "#9CA3AF", fontSize: 11, marginBottom: 4 }}>state</Text>
            {rows.map(([label, value]) => (
                <View key={label} style={{ flexDirection: "row", justifyContent: "space-between", gap: 16 }}>
                    <Text style={{ color: "#9CA3AF", fontSize: 11, fontFamily: "Courier" }}>{label}</Text>
                    <Text style={{ color: "#F3F4F6", fontSize: 11, fontFamily: "Courier" }}>{value}</Text>
                </View>
            ))}

            <Text style={{ color: "#9CA3AF", fontSize: 11, marginTop: 12, marginBottom: 4 }}>events</Text>
            {events.length === 0 ? (
                <Text style={{ color: "#6B7280", fontSize: 11 }}>(none yet)</Text>
            ) : (
                events.map((event, index) => (
                    <View key={`${event.time}-${index}`} style={{ flexDirection: "row", gap: 8 }}>
                        <Text style={{ color: "#6B7280", fontSize: 11, fontFamily: "Courier" }}>{event.time}</Text>
                        <Text style={{ color: "#9CA3AF", fontSize: 11, fontFamily: "Courier" }}>{event.source}</Text>
                        <Text style={{ color: "#F3F4F6", fontSize: 11, fontFamily: "Courier", flex: 1 }}>
                            {event.text}
                        </Text>
                    </View>
                ))
            )}
        </View>
    );
}
