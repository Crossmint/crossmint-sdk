import type React from "react";

export function WalletIcon({ style }: { style?: React.CSSProperties }) {
    return (
        <svg style={style} width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M15.0566 12.5H15.067M1.10156 3.5V17.5C1.10156 18.6046 2.02718 19.5 3.16898 19.5H17.6409C18.7827 19.5 19.7083 18.6046 19.7083 17.5V7.5C19.7083 6.39543 18.7827 5.5 17.6409 5.5L3.16898 5.5C2.02718 5.5 1.10156 4.60457 1.10156 3.5ZM1.10156 3.5C1.10156 2.39543 2.02718 1.5 3.16898 1.5H15.5735M15.5735 12.5C15.5735 12.7761 15.3421 13 15.0566 13C14.7712 13 14.5398 12.7761 14.5398 12.5C14.5398 12.2239 14.7712 12 15.0566 12C15.3421 12 15.5735 12.2239 15.5735 12.5Z"
                stroke={style?.color ?? "black"}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
