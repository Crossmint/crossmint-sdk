/** @format */
import { XIcon } from "@heroicons/react/solid";
import { useContext, useState } from "react";
import { toast } from "react-hot-toast";

import { AppContext } from "../../AppContext";
import coinIcon from "../../assets/icons/coin_icon.svg";
import { CustomSelect } from "../../components/Common/CustomSelect";
import InputV2 from "../../components/Common/InputV2";
import Modal from "../../components/Common/Modal";
import { Caption, MarginLessSecondaryTitle } from "../../components/Common/Text";
import Button from "../../components/button/Button";
import { WalletInput } from "../../helpers/walletInput";
import { transferTokenERC20 } from "../../utils/mintApi";

interface Props {
    show: boolean;
    onClose: () => void;
    currentToken: any;
    tokensArray: any;
    walletInstance: any;
}

export default function NftTransfer({ show, onClose, currentToken, tokensArray, walletInstance }: Props) {
    const { setTransferSuccess } = useContext(AppContext);
    const [loading, setLoading] = useState(false);

    function onCancel() {
        onClose && onClose();
    }
    const [quantity, setQuantity] = useState<string>("");
    const [currentTokenSelected, setCurrentToken] = useState<any>(tokensArray[0]);
    const [wallet, setWallet] = useState("");
    const [walletErrorMessage, setWalletErrorMessage] = useState<string | undefined>(undefined);

    function isValidEthereumAddress(address: string) {
        const regex = /^0x[a-fA-F0-9]{40}$/;
        return regex.test(address);
    }

    function handleWalletChange(value: string) {
        setWallet(value);

        const isValidAddress = isValidEthereumAddress(value.trim());
        setWalletErrorMessage(isValidAddress ? undefined : "Please enter a valid Ethereum address.");
    }

    function handleQuantityChange(value: string) {
        // This regex allows numbers that may include a decimal part
        const regex = /^\d*(\.\d+)?$/;

        // Check if the input matches the regex and does not exceed 100.0
        if (regex.test(value) && (value === "" || parseFloat(value) <= currentTokenSelected.balance)) {
            setQuantity(value);
        }
    }

    async function transfer() {
        setLoading(true);
        try {
            if (!walletInstance) {
                throw new Error("Wallet instance is not provided");
            }
            await transferTokenERC20(walletInstance, wallet, quantity);
            setTransferSuccess(true);
            toast.success("Transfer successful");
        } catch (error) {
            toast.error("Transfer failed");
        } finally {
            setLoading(false);
            onClose();
        }
    }

    return (
        <Modal
            defaultPadding={false}
            className="w-[25rem] bg-white rounded-[1rem] overflow-auto !m-0 p-8 !h-[400px] top-[-150px] md:top-0"
            show={show}
            onClose={onClose}
            closeOnOverlayClick={false}
        >
            <XIcon
                onClick={onCancel}
                className="absolute w-[1.25rem] h-[1.25rem] text-[#ABADC6] top-6 right-6 cursor-pointer font-light"
            />

            <div className="flex flex-col justify-between h-full">
                <div className="flex flex-col items-center w-full sm:px-1.5rem md:px-4rem text-center">
                    <MarginLessSecondaryTitle className="!self-center font-bold mb-[1.5rem]">
                        Transfer Token
                    </MarginLessSecondaryTitle>
                    <div className="flex items-start p-[1rem] w-full !rounded-md border border-[#E7E9ED]">
                        <div className="rounded-md mr-[1rem] mt-[0.5rem] aspect-square items-center self-stretch">
                            <img
                                src={currentToken?.logo || coinIcon}
                                alt="nftImage"
                                width="32"
                                height="32"
                                className="rounded-md"
                            />
                        </div>
                        <div className="flex-grow mr-[0.5rem] h-full flex items-start">
                            <CustomSelect
                                label="Select Token"
                                selected={currentToken.name}
                                options={tokensArray}
                                onSelect={(value) => {
                                    const selectedToken = tokensArray.find((token: any) => token.name === value);
                                    setCurrentToken(selectedToken);
                                }}
                            />
                        </div>

                        <div className="flex-grow h-full flex items-start">
                            <div className="flex flex-col items-start w-full">
                                <InputV2
                                    label="Quantity"
                                    value={quantity}
                                    required
                                    placeholder="Quantity"
                                    role="quantity"
                                    className={`w-full ${
                                        parseFloat(quantity) > currentTokenSelected.balance
                                            ? "border-red-500 text-red-500"
                                            : ""
                                    }`}
                                    type="text"
                                    pattern="^\d*(\.\d{0,18})?$"
                                    onChange={(e: any) => {
                                        handleQuantityChange(e.target.value);
                                    }}
                                    disabled={false}
                                />
                                <Caption className="text-xs mt-1 italic">Max: {currentTokenSelected.balance}</Caption>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col w-full mt-4">
                        <WalletInput
                            wallet={wallet}
                            setWallet={handleWalletChange}
                            errorMessage={walletErrorMessage}
                            setErrorMessage={setWalletErrorMessage}
                            caption={walletErrorMessage ? "" : "Insert a valid Ethereum wallet address"}
                        />
                    </div>
                </div>
                <Button
                    btnType="submit"
                    tiny
                    onClick={transfer}
                    loading={loading}
                    role="transfer"
                    type="primary"
                    className="flex flex-col justify-center items-center w-full px-[1.125rem] py-1 bg-[#36B37E] rounded-md shadow-md text-base text-[#FFF] font-semibold"
                    disabled={!quantity || !wallet}
                >
                    <Caption>Transfer</Caption>
                </Button>
            </div>
        </Modal>
    );
}
