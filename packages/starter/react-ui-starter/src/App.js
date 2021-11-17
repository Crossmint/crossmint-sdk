import { CrossMintButton, CrossMintModalProvider, CrossMintPopupProvider } from "@crossmint/mint-adapter-react-ui"

require("@crossmint/mint-adapter-react-ui/styles.css")


function App() {
    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CrossMintModalProvider>
                <CrossMintPopupProvider>
                    <CrossMintButton candyMachineId="aasdasd" />
                </CrossMintPopupProvider>
            </CrossMintModalProvider>
        </div>
    );
}

export default App;
