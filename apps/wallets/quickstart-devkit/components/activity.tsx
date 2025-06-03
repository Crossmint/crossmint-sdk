import { useEffect, useState } from "react";
import { type Activity as WalletActivity, useWallet } from "@crossmint/client-sdk-react-ui";

function formatDate(timestamp: number) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
}

function shortenAddress(addr: string) {
    return addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "";
}

function shortenHash(hash: string) {
    return hash ? hash.slice(0, 8) + "..." + hash.slice(-6) : "";
}

export function Activity() {
    const { wallet } = useWallet();
    const [activity, setActivity] = useState<WalletActivity | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function fetchActivity() {
            if (!wallet) {
                return;
            }
            setLoading(true);
            try {
                const activity = await wallet.experimental_activity();
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
        <div className="bg-white flex flex-col gap-3 rounded-xl border shadow-sm p-5">
            <div>
                <h2 className="text-lg font-medium">Recent activity</h2>
                <p className="text-sm text-gray-500">View your recent activity</p>
            </div>
            <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto border-t border-gray-100">
                {loading ? (
                    <div className="text-gray-500 text-center">Loading...</div>
                ) : !activity || activity.events.length === 0 ? (
                    <div className="text-gray-500 text-center">No recent activity</div>
                ) : (
                    activity.events.map((event, idx) => (
                        <div
                            key={event.transaction_hash + idx}
                            className="flex justify-between items-center py-2.5 border-t border-gray-100 first:border-t-0"
                        >
                            <div>
                                <div className="font-medium">
                                    {event.type} {event.amount} {event.token_symbol}
                                </div>
                                <div className="text-xs text-gray-500">
                                    {event.type === "Sent"
                                        ? `To: ${shortenAddress(event.to_address)}`
                                        : `From: ${shortenAddress(event.from_address)}`}
                                </div>
                                <div className="text-xs text-gray-400">
                                    Tx:{" "}
                                    <a
                                        href={`https://etherscan.io/tx/${event.transaction_hash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline"
                                    >
                                        {shortenHash(event.transaction_hash)}
                                    </a>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-gray-500">{formatDate(event.timestamp)}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Activity;
