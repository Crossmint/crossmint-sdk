import { useCrossmintWalletConnect } from "@/hooks/useCrossmintWalletConnect";

import EnterURIInput from "./EnterURIInput";
import { NumberedStep } from "./NumberedStep";

export default function EnterURI({ uri: initalURI }: { uri?: string }) {
    const { uiConfig, dictionary } = useCrossmintWalletConnect();

    return (
        <div
            className="flex flex-col items-center justify-start p-6 shadow-md sm:p-8 md:p-10 rounded-xl"
            style={{
                backgroundColor: uiConfig.colors.backgroundSecondary,
            }}
        >
            <div className="flex items-center w-full">
                <div className="flex flex-col items-start justify-start w-full sm:w-1/2">
                    <h1
                        className="text-2xl font-medium tracking-tight"
                        style={{
                            color: uiConfig.colors.textPrimary,
                        }}
                    >
                        {dictionary.enterURI.connectYourWallet(uiConfig.metadata.name)}
                    </h1>

                    <div className="my-10 space-y-5 sm:space-y-5">
                        {Object.values(dictionary.enterURI.steps).map((text, index) => (
                            <NumberedStep key={index} stepNumber={index + 1} text={text} />
                        ))}
                    </div>

                    <EnterURIInput uri={initalURI} />
                </div>

                <div className="items-center hidden w-1/2 space-y-4 sm:flex sm:flex-col">
                    <img
                        src="https://crossmint.com/assets/ui/wallet/wc/wc-modal.png"
                        alt="Crossmint logo"
                        className="pl-[75px]"
                        height={400}
                        width={350}
                    />
                    <p
                        className="text-sm font-light tracking-tight w-3/4 text-center"
                        style={{
                            color: uiConfig.colors.textSecondary,
                        }}
                    >
                        {dictionary.enterURI.linkCopyHint}
                    </p>
                </div>
            </div>
        </div>
    );
}
