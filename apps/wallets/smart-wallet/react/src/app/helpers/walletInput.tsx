import { useEffect } from "react";

import InputV2 from "../components/Common/InputV2";
import { Caption } from "../components/Common/Text";
import useDebounce from "../hooks/useDebounce";
import { cutAndAddEllipsis } from "../utils/strings";

interface WalletInputProps {
    wallet: string;
    setWallet: (wallet: string) => void;
    errorMessage: string | undefined;
    setErrorMessage: (errorMessage: string | undefined) => void;
    chain?: any;
    caption?: string;
}

export const WalletInput = ({ wallet, setWallet, errorMessage, setErrorMessage, chain, caption }: WalletInputProps) => {
    const [walletDebounce, setWalletDebounce] = useDebounce<string | undefined>(wallet, 50);

    useEffect(() => {
        setWalletDebounce(wallet);
    }, [wallet]);

    return (
        <>
            <InputV2
                value={wallet}
                required
                placeholder={cutAndAddEllipsis("0xE898BBd704CCE799e9593a9ADe2c1cA0351Ab660", 20)}
                role="mint-address"
                className="!w-full"
                errorMessage={errorMessage}
                onChange={(e) => setWallet(e.target.value)}
            />
            {caption && <Caption className="mt-[0.5rem] text-[#59797F]">{caption}</Caption>}
        </>
    );
};
