export interface ThemeConfig {
    id: string;
    label: string;
    adminRole: string;
    userRole: string;
    defaultToken: string;
    defaultLimit: string;
    defaultRecipients: string[];
    description: string;
    enabled: boolean;
}

export const themes: Record<string, ThemeConfig> = {
    corporate: {
        id: "corporate",
        label: "Corporate Expense Card",
        adminRole: "Finance Team",
        userRole: "Employee",
        defaultToken: "base-sepolia:usdc",
        defaultLimit: "50",
        defaultRecipients: [],
        description: "Delegate USDC spending to employees with daily limits and recipient whitelists.",
        enabled: true,
    },
    "ai-agent": {
        id: "ai-agent",
        label: "AI Agent Allowance",
        adminRole: "Operator",
        userRole: "AI Agent",
        defaultToken: "base-sepolia:usdc",
        defaultLimit: "100",
        defaultRecipients: [],
        description: "Grant an AI agent a scoped budget to execute onchain actions autonomously.",
        enabled: false,
    },
    allowance: {
        id: "allowance",
        label: "Family Allowance",
        adminRole: "Parent",
        userRole: "Child",
        defaultToken: "base-sepolia:usdc",
        defaultLimit: "20",
        defaultRecipients: [],
        description: "Give family members a weekly allowance with approved merchants only.",
        enabled: false,
    },
    gaming: {
        id: "gaming",
        label: "Gaming Guild Treasury",
        adminRole: "Guild Leader",
        userRole: "Member",
        defaultToken: "base-sepolia:usdc",
        defaultLimit: "200",
        defaultRecipients: [],
        description: "Let guild members spend from a shared treasury within strict limits.",
        enabled: false,
    },
};

export const themeList = Object.values(themes);
