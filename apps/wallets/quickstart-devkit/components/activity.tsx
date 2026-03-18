import { useEffect, useState } from "react";
import { type Transfers, useWallet } from "@crossmint/client-sdk-react-ui";
import { shortenAddress } from "@/lib/utils";

export function Activity() {
    const { wallet } = useWallet();
    const [activity, setActivity] = useState<Transfers | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchActivity() {
            if (wallet == null) {
                return;
            }
            setLoading(true);
            try {
                const activity = await wallet.transfers({ tokens: "eth", status: "successful" });
                setActivity(activity);
            } catch (error) {
                console.error("Error fetching wallet activity:", error);
                alert("Error fetching wallet activity: " + error);
            } finally {
                setLoading(false);
            }
        }
        fetchActivity();
    }, [wallet]);

    return (
        <div className="bg-white flex flex-col gap-3 rounded-xl border shadow-sm p-5" data-testid="activity-section">
            <div>
                <h2 className="text-lg font-medium">Recent activity</h2>
                <p className="text-sm text-gray-500">View your recent activity</p>
            </div>
            <div
                className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto border-t border-gray-100"
                data-testid="activity-events-container"
            >
                {loading ? (
                    <div className="text-gray-500 text-center" data-testid="activity-loading">
                        Loading...
                    </div>
                ) : !activity || activity.events.length === 0 ? (
                    <div className="text-gray-500 text-center" data-testid="activity-empty">
                        No recent activity
                    </div>
                ) : (
                    activity.events.map((event, idx) => (
                        <div
                            key={`${event.transaction_hash}-${idx}`}
                            data-testid={`activity-event-${idx}`}
                            className="flex justify-between items-center py-2.5 border-t border-gray-100 first:border-t-0"
                        >
                            <div>
                                <div className="font-medium">
                                    {event.amount} {event.token_symbol}
                                </div>
                                <div className="text-xs text-gray-500">
                                    From: {shortenAddress(event.from_address)} → To:{" "}
                                    {shortenAddress(event.to_address)}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Activity;
