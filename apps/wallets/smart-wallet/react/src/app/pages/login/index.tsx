import { useContext, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import type { EVMSmartWallet } from "@crossmint/client-sdk-smart-wallet";

import { AppContext } from "../../AppContext";
import { ReactComponent as BoltIcon } from "../../assets/icons/bolt_icon.svg";
import { ReactComponent as UserIcon } from "../../assets/icons/user_plus.svg";
import { ReactComponent as WalletIcon } from "../../assets/icons/wallet_icon.svg";
import landingBackground from "../../assets/images/landing_background.svg";
import { MarginLessSecondaryTitle, Paragraph, ParagraphBold, TerciaryTitle } from "../../components/Common/Text";
import Button from "../../components/button/Button";
import Switch from "../../components/switch/Switch";
import { createPasskeyWallet } from "../../utils/createAAWallet/createPasskeyWallet";
import { createViemAAWallet } from "../../utils/createAAWallet/createViemWallet";

const StepCard = ({ Icon, title, subtitle }: any) => {
    return (
        <div className="flex flex-col py-6 items-start space-y-4 self-stretch w-full md:w-1/3 px-2">
            <div className="p-4 border border-[#278272] rounded-xl">
                <Icon className="[&>path]:stroke-[#278272] [&>path]:stroke-[2] h-[1.5rem] w-[1.5rem]" />
            </div>
            <MarginLessSecondaryTitle className="max-h-[4rem]">{title}</MarginLessSecondaryTitle>
            <TerciaryTitle className="!font-normal !text-[#67797F] !mt-2">{subtitle}</TerciaryTitle>
        </div>
    );
};

export const Login = () => {
    const { setValue, setIsAuthenticated, setIsProd } = useContext(AppContext);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const [isSwitchOn, setIsSwitchOn] = useState(false);

    const handleSwitchChange = (checked: boolean) => {
        setIsSwitchOn(checked);
        setIsProd(checked);
    };

    const login = async () => {
        setLoading(true);
        const testAccountPrivateKey = localStorage.getItem("testAccountPrivateKey") as `0x${string}` | null;

        let account: EVMSmartWallet;
        try {
            account = testAccountPrivateKey
                ? await createViemAAWallet(isSwitchOn, testAccountPrivateKey)
                : await createPasskeyWallet(isSwitchOn);
        } catch (e) {
            setLoading(false);
            return;
        }
        setLoading(false);

        if (!account) {
            toast.error(`Error occurred during account register`);
            return;
        }

        toast.success(`Login Successfully`);
        setIsAuthenticated(true);
        localStorage.setItem("isUserConnected", "true");
        setValue(account);
        navigate("/mint");
    };

    return (
        <div className="flex flex-col items-center justify-center">
            <div
                className="absolute top-0 left-0 w-full bg-center bg-no-repeat bg-cover z-0"
                style={{
                    backgroundImage: `url(${landingBackground})`,
                    backgroundPosition: window.innerWidth < 640 ? "center" : "center -5.5rem",
                    height: window.innerWidth < 640 ? "5rem" : "50%",
                }}
            />

            <div className="relative z-10 flex flex-col items-start md:w-[67.5rem] w-full h-full p-[2.5rem] md:px-12 px-4 space-y-4 md:border md:border-[#E7E9ED] border-t-0 border-l-0 border-r-0 bg-white md:rounded-lg shadow-sm overflow-y-auto flex-grow">
                <div>
                    <Paragraph className="text-[#278272] font-normal border border-[#278272] rounded-full px-4 py-2">
                        New!
                    </Paragraph>
                </div>
                <ParagraphBold className="text-[#20343E] !text-4xl font-medium">Crossmint AA Wallet Demo</ParagraphBold>
                <div className="flex items-center">
                    {" "}
                    {/* Flex container for switch and text */}
                    <Switch checked={isSwitchOn} onChange={handleSwitchChange} />
                    <span className="ml-2">{isSwitchOn ? "Polygon" : "Amoy"}</span>
                </div>
                <TerciaryTitle className="text-[#20343E] !font-normal max-w-[40rem]">
                    With Crossmint&apos;s Account Abstraction solution, you can deploy compliant, easy-to-use, gasless
                    wallets with just a few clicks.
                </TerciaryTitle>

                <TerciaryTitle className="text-[#20343E] !font-normal !mt-1 max-w-[40rem]">
                    Our unique architecture ensures NFTs are never at risk of loss while remaining non-custodial.
                </TerciaryTitle>

                <Button
                    loading={loading}
                    type="primary"
                    className="flex flex-col justify-center items-center !mt-[2rem] !mb-[1rem] w-[13.125rem] h-[3rem] px-[1.125rem] bg-[#278272] rounded-lg shadow-md text-base text-[#FFF] font-semibold"
                    onClick={login}
                >
                    Try it!
                </Button>

                <div className="border-b border-[#E7E9ED] w-full" />

                <div className="flex flex-col md:flex-row py-2 items-start self-stretch !mb-[4rem]">
                    <StepCard
                        Icon={UserIcon}
                        title="1. Create account"
                        subtitle="Allow users to create an account abstraction wallet with a few clicks, using familiar sign-in methods like social and email / passwordless"
                    />
                    <StepCard
                        Icon={BoltIcon}
                        title="2. Create flexible wallet experiences"
                        subtitle="Build dynamic and customizable wallet experiences using Crossmint's wallet APIs"
                    />
                    <StepCard
                        Icon={WalletIcon}
                        title="3. Leverage full wallet functionality"
                        subtitle="Easily empower a broad set of use case in a gas-less way for your users"
                    />
                </div>

                <div className="mt-auto flex flex-col md:flex-row justify-between items-center w-full">
                    <Paragraph className="text-[#67797F] mb-2 md:mb-0">
                        Copyright © 2023 Crossmint. All rights reserved
                    </Paragraph>
                    <div className="flex flex-row items-center space-x-2 text-sm">
                        <Paragraph className="font-medium text-[#67797F]">Terms & Conditions</Paragraph>
                        <div className="text-gray-400">•</div>
                        <Paragraph className="font-medium text-[#67797F]">Privacy Policy</Paragraph>
                        <div className="text-gray-400">•</div>
                        <Paragraph className="font-medium text-[#67797F]">Cookies</Paragraph>
                    </div>
                </div>
            </div>
        </div>
    );
};
