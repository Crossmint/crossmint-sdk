/** @format */
import { useContext, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { AppContext } from "../../AppContext";
import Button from "../../components/button/Button";
import { createPasskeyWallet } from "../../utils/createAAWallet/createPasskeyWallet";
import { createViemAAWallet } from "../../utils/createAAWallet/createViemWallet";
import { mintNFT } from "../../utils/mintApi";

export const Mint = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { value, isProd, setIsAuthenticated, setValue } = useContext(AppContext);

    const createAndSetAAWallet = async () => {
        const testAccountPrivateKey = localStorage.getItem("testAccountPrivateKey") as `0x${string}` | null;
        const account = testAccountPrivateKey
            ? await createViemAAWallet(isProd, testAccountPrivateKey)
            : await createPasskeyWallet(isProd);

        setIsAuthenticated(true);
        localStorage.setItem("isUserConnected", "true");
        setValue(account);
        return account;
    };

    const tryMintingNFT = async (wallet: any) => {
        try {
            const minted = await mintNFT(wallet);
            if (minted) {
                toast.success(`NFT Minted Successfully`);
                navigate("/wallet");
            }
        } catch (error) {
            toast.error(`Error occurred during mint: ${error}`);
        } finally {
            setLoading(false);
        }
    };

    const mint = async () => {
        setLoading(true);
        if (value === undefined) {
            try {
                const wallet = await createAndSetAAWallet();
                if (wallet !== undefined) {
                    await tryMintingNFT(wallet);
                }
            } catch (error) {
                toast.error(`Error occurred during account verification`);
            } finally {
                setLoading(false);
            }
        } else {
            await tryMintingNFT(value);
        }
    };

    return (
        <div className="flex p-[1rem] flex-col justify-center items-center gap-[1rem] w-auto md:w-[25rem] mx-auto">
            <div className="flex p-[1.25rem] flex-col items-center rounded-lg border border-[#E7E9ED] bg-[#FFF]">
                <img
                    src="https://bafkreievg3akxgi2arfi6njrmkyy55vga5tfnav5nx2btcew2z7hbgpbyy.ipfs.nftstorage.link"
                    alt="Mint"
                    className="rounded-lg w-[18.75rem] h-[18.75rem]"
                />
                <div className="flex flex-col items-start self-stretch mt-[1.25rem]">
                    <p className="text-xl text-[#20343E] font-bold">Crossmint Icecream</p>
                    <p className="text-base text-[#67797F] font-normal">Crossmint</p>
                </div>

                <Button
                    type="primary"
                    loading={loading}
                    onClick={mint}
                    className="flex text-[#FFF] mt-[2rem] font-semibold h-[2.625rem] py-0.5 px-1.125 flex-col justify-center items-center gap-0.5 self-stretch rounded-md bg-[#278272] shadow-md"
                >
                    Mint
                </Button>
            </div>

            <div className="flex flex-col justify-center text-center px-[1rem] my-[1rem] font-semibold text-base items-center">
                <p>Let your users mint NFTs gas-free directly to their new Abstraction Account wallet</p>
            </div>
        </div>
    );
};
