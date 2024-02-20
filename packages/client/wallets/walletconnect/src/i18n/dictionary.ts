const SUPPORTED_LOCALES = ["en-US", "ja-JP"] as const;
export type CrossmintWalletConnectLocale = (typeof SUPPORTED_LOCALES)[number];

export type CrossmintWalletConnectDictionary = {
    enterURI: {
        connectYourWallet: (walletName: string) => string;
        steps: {
            0: string;
            1: string;
            2: string;
            3: string;
            4: string;
        };
        linkCopyHint: string;
        enterWCURI: string;
        pasteURI: string;
    };
    sessionProposal: {
        wantsToAccessYourWallet: (walletName: string) => string;
        wouldLikeTo: string;
        viewYourWalletAddress: (walletName: string) => string;
        viewYourNFTs: string;
        wontBeAbleTo: string;
        takeActionsWithoutPermission: string;
        accessPersonalInformation: string;
    };
    unsupportedChainsRequested: {
        unsupportedChain_s: (count: number) => string;
        requiresSupportFor: string;
        butWalletDoesNotSupportChain_s: (count: number) => string;
    };
    connectedSession: {
        yourWalletIsConnected: string;
        leaveThisTabOpen: string;
        dontCloseThisWindow: string;
    };
    unsupportedMethodRequested: {
        unsupportedMethod: string;
        hasRequestedYouTo: string;
        butWalletDoesNotSupportThisMethod: string;
        signAMessage: string;
        sendATransaction: string;
        performAnOperation: (method: string) => string;
    };
    sendTransaction: {
        wantsYouToSendTransaction: string;
        transactionColon: string;
    };
    signMessage: {
        wantsYouToSignMessage: string;
        messageColon: string;
    };
    buttons: {
        connect: string;
        cancel: string;
        close: string;
        send: string;
        sign: string;
    };
    common: {
        and: string;
    };
};

export const i18NDictionary: Record<CrossmintWalletConnectLocale, CrossmintWalletConnectDictionary> = {
    "en-US": {
        enterURI: {
            connectYourWallet: (walletName) => `Connect your ${walletName} wallet`,
            steps: {
                0: "Go to the website you want to connect to",
                1: "Click on Connect Wallet",
                2: "Select Wallet Connect from the list",
                3: "Copy URI to clipboard *",
                4: "Come back here & paste the URI",
            },
            linkCopyHint: "* Click on the top-right icon to copy URI",
            enterWCURI: "Enter Wallet Connect URI",
            pasteURI: "Paste URI",
        },
        sessionProposal: {
            wantsToAccessYourWallet: (walletName) => `wants to access your ${walletName} wallet`,
            wouldLikeTo: "This app would like to:",
            viewYourWalletAddress: (walletName) => `View your ${walletName} wallet address`,
            viewYourNFTs: "View your NFTs",
            wontBeAbleTo: "It won't be able to:",
            takeActionsWithoutPermission: "Take actions without your permission",
            accessPersonalInformation: "Access any personal information (email, name, etc.)",
        },
        unsupportedChainsRequested: {
            unsupportedChain_s(count) {
                return `Unsupported ${count > 1 ? "chains" : "chain"}`;
            },
            butWalletDoesNotSupportChain_s(count) {
                return `but your wallet does not support ${count > 1 ? "these chains" : "this chain"}`;
            },
            requiresSupportFor: "requires support for",
        },
        connectedSession: {
            yourWalletIsConnected: "Your wallet is connected :)",
            leaveThisTabOpen: "You're signed in on your app, but leave this tab open to respond to requests",
            dontCloseThisWindow: "Don't close this window",
        },
        unsupportedMethodRequested: {
            unsupportedMethod: "Unsupported Method",
            hasRequestedYouTo: "has requested you to",
            butWalletDoesNotSupportThisMethod: "but your wallet does not support this method",
            signAMessage: "sign a message",
            sendATransaction: "send a transaction",
            performAnOperation: (method) => `perform a ${method} operation`,
        },
        sendTransaction: {
            wantsYouToSendTransaction: "wants you to send a transaction",
            transactionColon: "Transaction:",
        },
        signMessage: {
            wantsYouToSignMessage: "wants you to sign a message",
            messageColon: "Message:",
        },
        buttons: {
            connect: "Connect",
            cancel: "Cancel",
            close: "Close",
            send: "Send",
            sign: "Sign",
        },
        common: {
            and: "and",
        },
    },
    "ja-JP": {
        enterURI: {
            connectYourWallet: (walletName) => `${walletName}のウォレットを接続してください`,
            steps: {
                "0": "接続したいウェブサイトに行ってください",
                "1": "「ウォレットを接続」をクリックしてください",
                "2": "リストからWallet Connectを選択してください",
                "3": "URIをクリップボードにコピーしてください *",
                "4": "こちらに戻ってきて、URIを貼り付けてください",
            },
            linkCopyHint: "* URIをコピーするには、右上のアイコンをクリックしてください",
            enterWCURI: "Wallet ConnectのURIを入力してください",
            pasteURI: "URIを貼り付けてください",
        },
        sessionProposal: {
            wantsToAccessYourWallet: (walletName) => `${walletName}のウォレットへのアクセスを求めています`,
            wouldLikeTo: "このアプリは以下のことを行いたいと考えています:",
            viewYourWalletAddress: (walletName) => `${walletName}のウォレットアドレスを表示する`,
            viewYourNFTs: "あなたのNFTを表示する",
            wontBeAbleTo: "以下のことはできません:",
            takeActionsWithoutPermission: "あなたの許可なく行動を起こす",
            accessPersonalInformation: "個人情報（メール、名前など）にアクセスする",
        },
        unsupportedChainsRequested: {
            unsupportedChain_s() {
                return `サポートされていないブロックチェーン`;
            },
            butWalletDoesNotSupportChain_s(count) {
                return `しかし、あなたのウォレットは${
                    count > 1 ? "これらのブロックチェーン" : "このブロックチェーン"
                }をサポートしていません`;
            },
            requiresSupportFor: "サポートが必要です",
        },
        connectedSession: {
            yourWalletIsConnected: "あなたのウォレットは接続されています :)",
            leaveThisTabOpen:
                "あなたのアプリにサインインしていますが、リクエストに応答するためにこのタブを開いたままにしてください",
            dontCloseThisWindow: "このウィンドウを閉じないでください",
        },
        unsupportedMethodRequested: {
            unsupportedMethod: "サポートされていないメソッド",
            hasRequestedYouTo: "があなたにリクエストしています",
            butWalletDoesNotSupportThisMethod: "しかし、あなたのウォレットはこのメソッドをサポートしていません",
            signAMessage: "メッセージに署名する",
            sendATransaction: "トランザクションを送信する",
            performAnOperation: (method) => `${method}操作を行う`,
        },
        sendTransaction: {
            wantsYouToSendTransaction: "トランザクションの送信を求めています",
            transactionColon: "トランザクション:",
        },
        signMessage: {
            wantsYouToSignMessage: "メッセージに署名することを求めています",
            messageColon: "メッセージ:",
        },
        buttons: {
            connect: "接続",
            cancel: "キャンセル",
            close: "閉じる",
            send: "送信",
            sign: "署名",
        },
        common: {
            and: "そして",
        },
    },
};

export function getDictionary(locale: CrossmintWalletConnectLocale) {
    return i18NDictionary[locale];
}
