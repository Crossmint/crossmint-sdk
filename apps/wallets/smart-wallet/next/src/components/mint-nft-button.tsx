import { useWallet } from "@/hooks/useWallet";

import { Button } from "./button";
import { Typography } from "./typography";

export const MintNFTButton = () => {
    const { handleMint, isLoading } = useWallet();

    if (isLoading) {
        return (
            <div className="flex gap-2 items-center self-center min-h-12" role="status">
                <svg
                    aria-hidden="true"
                    className="w-6 h-6 fill-secondary-foreground animate-spin text-primary-foreground"
                    viewBox="0 0 100 101"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                        fill="currentColor"
                    />
                    <path
                        d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                        fill="currentFill"
                    />
                </svg>
                <Typography className="text-primary-foreground" variant={"h4"}>
                    Minting your NFT...
                </Typography>
            </div>
        );
    }

    return (
        <Button
            className="bg-card rounded-full text-secondary-foreground font-semibold text-[17px] gap-2 shadow-primary border border-color-secondary-foreground"
            onClick={handleMint}
        >
            <div
                style={{
                    display: "flex",
                    gap: 8,
                    background: "linear-gradient(to right, #602C1B, #eb987d)",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                }}
            >
                <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                        d="M6.50219 19.0304C6.5199 19.0005 6.53804 18.9709 6.55662 18.9413C7.91111 16.7881 8.69522 14.2418 8.69522 11.5C8.69522 9.29086 10.4861 7.5 12.6952 7.5C14.9044 7.5 16.6952 9.29086 16.6952 11.5C16.6952 12.517 16.626 13.5186 16.4919 14.5M14.3745 21.3436C14.9862 20.1226 15.4877 18.8369 15.866 17.5M19.705 18.632C20.35 16.3657 20.6953 13.9732 20.6953 11.5C20.6953 7.08172 17.1136 3.5 12.6953 3.5C11.2382 3.5 9.87201 3.88958 8.69531 4.57026M3.69531 15.8641C4.33597 14.5454 4.69531 13.0646 4.69531 11.5C4.69531 10.0429 5.08489 8.67669 5.76557 7.5M12.6952 11.5C12.6952 15.0172 11.6864 18.2988 9.94238 21.0712"
                        stroke="#602C1B"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                Mint NFT
            </div>
        </Button>
    );
};
