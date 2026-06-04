"use client";

import { useWallet, useCrossmintAuth } from "@crossmint/client-sdk-react-ui";
import { CrossmintAuthLoginButton } from "@/components/login-button";
import { useTheme } from "@/lib/theme-context";
import { PermissionsSummary } from "@/components/permissions-summary";
import { EmployeeTransfer } from "@/components/employee-transfer";
import { BudgetGauge } from "@/components/budget-gauge";
import { shortenAddress } from "@/lib/utils";

export default function EmployeePage() {
    const { theme } = useTheme();
    const { wallet, status } = useWallet();
    const { status: authStatus } = useCrossmintAuth();

    const isLoading = status === "in-progress" || authStatus === "initializing";
    const isLoggedIn = wallet != null && status === "loaded";

    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!isLoggedIn) {
        return (
            <div className="flex flex-col gap-4 justify-center items-center py-20">
                <h1 className="text-xl font-medium">{theme.userRole} Portal</h1>
                <p className="text-muted-foreground text-sm">Sign in to view your spending permissions.</p>
                <div className="max-w-md mt-3 w-full min-h-[38px]">
                    <CrossmintAuthLoginButton />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">{theme.userRole} Portal</h1>
                <p className="text-muted-foreground text-sm mt-1">
                    Wallet:{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                        {shortenAddress(wallet.address)}
                    </code>
                </p>
            </div>

            <PermissionsSummary walletAddress={wallet.address} />
            <BudgetGauge walletAddress={wallet.address} />
            <EmployeeTransfer />
        </div>
    );
}
