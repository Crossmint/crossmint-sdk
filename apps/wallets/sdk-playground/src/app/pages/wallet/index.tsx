/** @format */
import CircularProgress from "@mui/material/CircularProgress";
import { useContext, useEffect, useState } from "react";

import { AppContext } from "../../AppContext";
import coinCoin from "../../assets/icons/coin_icon.svg";
import nftCardIcon from "../../assets/icons/no_nfts.svg";
import Button from "../../components/button/Button";
import Card from "../../components/card/Card";
import { createPasskeyWallet } from "../../utils/createAAWallet/createPasskeyWallet";
import { createViemAAWallet } from "../../utils/createAAWallet/createViemWallet";
import { getTokenBalances, hexBalanceToDecimalValue, walletContent } from "../../utils/mintApi";
import NftBurn from "./NftBurn";
import NftTransfer from "./NftTransfer";

interface Tokens {
    name: string;
    symbol: string;
    balance: string;
    logo?: string;
}

export const Wallet = () => {
    const { value, transferSuccess, soldNft, isProd, setSoldNft, setIsAuthenticated, setValue } =
        useContext(AppContext);
    const [tokensArray, setTokens] = useState<Tokens[]>([]);
    const [nftsArray, setNfts] = useState<any>([]);
    const [loadingTokenId] = useState<string | null>(null);
    const [showNftBurnModal, setShowNftBurnModal] = useState(false);
    const [showNftTransferModal, setShowNftTransferModal] = useState(false);
    const [currentNft, setCurrentNft] = useState<any>(null);
    const [currentToken, setCurrentToken] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [totalBalance, setTotalBalance] = useState("0.00");

    const createAndSetAAWallet = async () => {
        const testAccountPrivateKey = localStorage.getItem("testAccountPrivateKey") as `0x${string}` | null;
        const account = testAccountPrivateKey
            ? await createViemAAWallet(isProd, testAccountPrivateKey)
            : await createPasskeyWallet(isProd);

        setIsAuthenticated(true);
        localStorage.setItem("isUserConnected", "true");
        setValue(account);
    };
    const handleOpenNftBurnModal = async (nft: any) => {
        setCurrentNft(nft);
        setShowNftBurnModal(true);
    };

    const handleCloseNftBurnModal = () => {
        setCurrentNft(null);
        setShowNftBurnModal(false);
    };

    const handleOpenNftTransferModal = async () => {
        setCurrentToken(tokensArray[0]);
        setShowNftTransferModal(true);
    };

    const handleCloseNftTransferModal = () => {
        setCurrentToken(null);
        setShowNftTransferModal(false);
    };

    useEffect(() => {
        getTokenMeta();
    }, [transferSuccess]);

    useEffect(() => {
        if (value === undefined) {
            createAndSetAAWallet();
        } else {
            getTokenMeta();
            getNfts();
        }
    }, [value]);

    useEffect(() => {
        function fetchAndUpdate() {
            getTokenMeta();
            getNfts();
            setSoldNft(false);
        }

        fetchAndUpdate();
    }, [soldNft, setSoldNft]);

    const getNfts = async () => {
        setLoading(true);
        if (value && (await value.address)) {
            setNfts([]);
            const nfts = await walletContent(value, isProd);
            console.log({ nfts });
            setNfts(nfts);
            setLoading(false);
        }
    };

    const getTokenMeta = async () => {
        if (value && value.address) {
            setTokens([]);
            const tokenBalances = await getTokenBalances(value.address, isProd, value.chain);
            if (tokenBalances == null) {
                return;
            }
            const allTokens = tokenBalances.map((token: any) => {
                if (token.tokenBalance === "0x" + "0".repeat(64)) {
                    return null;
                }
                return {
                    name: token.tokenMetadata.name,
                    symbol: token.tokenMetadata.symbol,
                    balance: hexBalanceToDecimalValue(token.tokenBalance),
                };
            });
            const nonZeroTokens = allTokens.filter(Boolean);
            setTokens(nonZeroTokens);
        }
    };
    const updateTotalBalance = () => {
        const newTotal = tokensArray.reduce((sum, token) => sum + parseFloat(token.balance), 0).toFixed(2);
        // Assuming you have a state variable to hold the total balance
        setTotalBalance(newTotal);
    };

    useEffect(() => {
        const interval = setInterval(() => {
            updateTotalBalance();
        }, 1000);

        return () => clearInterval(interval);
    }, [tokensArray]);

    return (
        <div className="flex flex-col md:flex-row justify-center !p-[2rem] md:p-0 w-full">
            <div className="flex w-full md:w-[22.5rem]  h-fit flex-col items-center rounded-lg border border-[#E7E9ED] bg-[#FFF] md:mr-[1rem] ">
                <div className="flex flex-col items-start w-full p-[1rem] md:p-[2rem]">
                    <p className="text-xl font-bold text-[#20343E] truncate w-32">${totalBalance}</p>
                    <p className="text-base font-normal text-[#67797F]">Total Balance</p>
                </div>

                <div className="flex flex-col items-start w-full p-[1rem] md:p-[2rem] bg-[#FFF] md:mt-[-2rem]">
                    {tokensArray && tokensArray.length > 0 ? (
                        tokensArray.map((token, index) => (
                            <div
                                className={`flex flex-row justify-between items-center rounded-md w-full ${
                                    tokensArray.length > 1 && index !== tokensArray.length - 1
                                        ? "border-b border-[#E7E9ED]"
                                        : ""
                                }`}
                                key={token.name}
                            >
                                <img
                                    src={token.logo || coinCoin}
                                    alt="Symbol"
                                    className="w-[2rem] md:w-[2.25rem] h-[2rem] md:h-[2.25rem] mr-[1rem]"
                                />
                                <div className="flex flex-col">
                                    <p className="text-base font-semibold text-[#20343E]">{token.name}</p>
                                    <p className="text-base font-normal text-[#67797F] truncate w-24">
                                        ${token.balance}
                                    </p>
                                </div>

                                <p className="text-base font-semibold text-[#20343E] ml-auto truncate w-24">
                                    {token.symbol === "USDT" ? "$" : token.symbol}
                                    {token.balance}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-base font-normal text-[#67797F]">You don't own any tokens</p>
                    )}
                </div>

                <div className="flex flex-col items-center w-full p-[1rem] md:p-[2rem] md:mt-[-1rem]">
                    <Button
                        disabled={tokensArray.length === 0}
                        type="tertiary"
                        onClick={() => handleOpenNftTransferModal()}
                        className="h-[2.75rem] w-full text-[#20343E] font-semibold text-base rounded-lg py-2 px-4 border border-[#E7E9ED] bg-[#FFF]"
                    >
                        Transfer
                    </Button>
                </div>
            </div>

            <div className="flex flex-col w-full md:w-3/4 p-[1rem] md:p-[2rem] rounded-lg border border-[#E7E9ED] bg-[#FFF] mb-[3rem] mt-[1rem] md:mt-0">
                {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <CircularProgress />
                    </div>
                ) : (
                    <>
                        {value && nftsArray.length > 0 ? (
                            <>
                                <div className="flex flex-row items-center px-1 md:px-0 mb-[1rem] md:mb-[2.5rem]">
                                    <p className="text-2xl font-bold text-[#20343E] mr-[0.75rem]">Assets</p>
                                    <p className="text-sm text-[#67797F] mt-[0.375rem]">{nftsArray.length} Items</p>
                                </div>

                                <div className="flex flex-wrap justify-start items-start w-full">
                                    {nftsArray.map((nft: any, index: any) => (
                                        <div
                                            className={`w-1/2 px-1 sm:px-1 md:w-auto md:px-0 mb-10 ${
                                                index % 2 === 0
                                                    ? "pr-1 sm:pr-1 md:pr-0 md:mr-4"
                                                    : "pl-1 sm:pl-1 md:pl-0 md:mr-4"
                                            }`}
                                            key={index}
                                        >
                                            <Card
                                                // todo fix issue with metadata not existing until second hard refresh.
                                                name={nft?.metadata.name}
                                                description={nft?.metadata.description}
                                                image={nft?.metadata.image}
                                                action={"Sell"}
                                                tokenId={nft.tokenId}
                                                onActionClick={() => handleOpenNftBurnModal(nft)}
                                                listOnReservoir={() => console.log("hi")}
                                                loading={nft.tokenId === loadingTokenId}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col justify-center items-center h-auto md:h-[30rem] py-8 md:py-0">
                                <img
                                    src={nftCardIcon}
                                    alt="Card"
                                    className="w-[6.25rem] h-[6.25rem] rounded-lg mb-[0.5rem]"
                                />
                                <p className="text-lg text-[#20343E] font-bold">This is your wallet</p>
                                <p className="text-base text-[#67797F] font-normal">
                                    Your NFTs will appear here when minted. If you aren't seeing your NFT, please try
                                    refreshing the page
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {currentNft && <NftBurn show={showNftBurnModal} onClose={handleCloseNftBurnModal} nft={currentNft} />}
            {currentToken && (
                <NftTransfer
                    show={showNftTransferModal}
                    onClose={handleCloseNftTransferModal}
                    currentToken={currentToken}
                    tokensArray={tokensArray}
                    walletInstance={value}
                />
            )}
        </div>
    );
};
