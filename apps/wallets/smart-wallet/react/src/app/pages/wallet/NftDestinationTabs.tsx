import Tabs, { type Tab, type TabId } from "../../components/Common/Tabs";
import { WalletInput } from "../../helpers/walletInput";
import { classNames } from "../../utils/uiUtils";

export enum TabsId {
    WALLET = "wallet",
}

const TabOptions: Tab[] = [
    {
        name: "Wallet",
        id: TabsId.WALLET,
    },
];

type TabValue = {
    value: string;
    setValue: (value: string) => void;
    errorMessage: string | undefined;
    setErrorMessage: (value: string | undefined) => void;
    caption?: string;
};
type NFTDestinationTabsProps = {
    collection?: any;
    wallet: TabValue;
    inputType: TabsId;
    handleTabChange: (tabId: TabId) => void;
    tabClasses?: string;
};

export default function NFTDestinationTabs({
    collection,
    wallet,
    inputType,
    tabClasses,
    handleTabChange,
}: NFTDestinationTabsProps) {
    function renderRecipientInput() {
        switch (inputType) {
            case TabsId.WALLET:
                return (
                    <WalletInput
                        wallet={wallet.value}
                        setWallet={wallet.setValue}
                        errorMessage={wallet.errorMessage}
                        setErrorMessage={wallet.setErrorMessage}
                        caption={wallet.caption}
                        // chain={collection?.chain!}
                    />
                );
            default:
                return null;
        }
    }

    return (
        <>
            <Tabs
                tabs={TabOptions}
                selectedTab={inputType}
                onChange={handleTabChange}
                containerClassName="w-full"
                type="custom"
                tabClasses={classNames(
                    "p-[0.25rem] space-x-[0.125rem] rounded-[0.5rem] bg-[#F8F9FB] justify-center w-full",
                    tabClasses
                )}
                itemClassName="cursor-pointer flex flex-row w-full justify-center items-center text-sm px-[1rem] py-[0.5rem] rounded-[0.5rem] border border-solid"
                activeTabClassname="border-[#E6EEF1] bg-white"
                inactiveTabClassname="border-transparent bg-transparent hover:bg-[#E6EEF1] hover:rounded-lg"
                customTabText="text-sm text-[#59797F]"
            />
            <div className={classNames("w-full")}>{renderRecipientInput()}</div>
        </>
    );
}
