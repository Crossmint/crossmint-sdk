import { CrossMintButton, CrossMintProvider } from "@crossmint/mint-adapter-react-ui";

require("@crossmint/mint-adapter-react-ui/styles.css")


function App() {
    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CrossMintProvider>
                <CrossMintButton candyMachineId="<CANDY_MACHINE_ID>"  theme="dark"/>
            </CrossMintProvider>
        </div>
    );
}

export default App;
