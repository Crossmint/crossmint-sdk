import { XIcon } from "@heroicons/react/solid";
import { useContext, useEffect } from "react";
import { useState } from "react";
import toast from "react-hot-toast";

import { AppContext } from "../../AppContext";
import sellIcon from "../../assets/icons/sell_icon.svg";
import InputV2 from "../../components/Common/InputV2";
import Modal from "../../components/Common/Modal";
import { Caption, MarginLessSecondaryTitle, Paragraph, ParagraphBold } from "../../components/Common/Text";
import Button from "../../components/button/Button";
import { sellNFT } from "../../utils/mintApi";
import { classNames } from "../../utils/uiUtils";

interface Props {
    show: boolean;
    onClose: () => void;
    nft: any;
}

export default function NftBurn({ show, onClose, nft }: Props) {
    const { value, setSoldNft } = useContext(AppContext);
    const [loading, setLoading] = useState(false);
    const [address, setAddress] = useState<`0x${string}`>();

    useEffect(() => {
        const fetchData = async () => {
            setAddress(value?.address);
            // Otro código asíncrono si es necesario
        };

        fetchData();
    }, [value]);

    function onCancel() {
        onClose && onClose();
    }

    async function burn() {
        if (!value) {
            toast.error("Wallet not available");
            return;
        }

        setLoading(true);
        try {
            await sellNFT(value, nft.tokenId);
            setSoldNft(true);
            toast.success(`NFT Sold Successfully`);
        } catch (error) {
            toast.error(`Error occurred during burn: ${error}`);
        } finally {
            setLoading(false);
            onClose();
        }
    }

    const buttonGroup = classNames(
        "group leading-normal box-border border-[#FFD5D7] flex flex-row justify-center items-center p-2 w-full h-[2.5rem] bg-white border rounded-lg order-2 enabled:hover:text-custom-text-primary enabled:hover:border-[#AC2E35] enabled:hover:bg-white"
    );

    const buttonText = classNames(
        "font-inter font-semibold text-xs flex flex-row items-center text-center text-[#F25F67] order-1 flex-none group-hover:text-[#AC2E35]"
    );

    return (
        <div className="flex items-center justify-center h-screen">
            <Modal
                defaultPadding={false}
                className="w-[25rem] h-auto h-auto bg-white rounded-[1rem] overflow-auto !m-0 p-8"
                show={show}
                onClose={onClose}
                closeOnOverlayClick={false}
            >
                <XIcon
                    onClick={onCancel}
                    className="absolute w-[1.25rem] h-[1.25rem] text-[#ABADC6] absolute top-6 right-6 cursor-pointer font-light"
                />
                <div className="flex flex-col items-center w-full sm:px-1.5rem md:px-4rem text-center">
                    <img src={sellIcon} alt="warning" width={72} height={72} className="mb-[1.5rem]" />
                    <MarginLessSecondaryTitle className="!self-center font-bold mb-[1.5rem]">
                        You are about to sell the {nft?.metadata?.name} NFT.
                    </MarginLessSecondaryTitle>

                    <Paragraph className="!self-center mb-[0.75rem]">
                        This process <ParagraphBold className="inline">cannot be undone</ParagraphBold>. It will remove
                        the NFT from the next wallet:
                    </Paragraph>
                    {nft?.contractAddress && (
                        <div className="w-full">
                            <InputV2
                                required
                                name="metadata.title"
                                value={address}
                                placeholder="NFT address"
                                role="nft-address"
                                disabled={true}
                                className="bg-[#E6EEF1] text-[#67797F] w-full"
                            />
                        </div>
                    )}
                    <Paragraph className="!self-center mb-[2rem] mt-[0.75rem]">Please, confirm your action</Paragraph>
                </div>
                <Button onClick={burn} type="tertiary" className={buttonGroup} disabled={loading}>
                    <Caption className={buttonText}>{loading ? "Selling..." : "Sell"}</Caption>
                </Button>
            </Modal>
        </div>
    );
}
