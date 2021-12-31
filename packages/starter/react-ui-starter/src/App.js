import { CrossMintButton, CrossMintProvider } from "@crossmint/client-sdk-react-ui";

require("@crossmint/client-sdk-react-ui/styles.css");

function App() {
    return (
        <div
            style={{ width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}
        >
            <CrossMintProvider>
                <CrossMintButton
                    candyMachineId="<CANDY_MACHINE_ID>"
                    collectionTitle="<TITLE_FOR_YOUR_COLLECTION>"
                    collectionDescription="<DESCRIPTION_OF_YOUR_COLLECTION>"
                    collectionPhoto="<OPT_URL_TO_PHOTO_COVER>"
                />
            </CrossMintProvider>
        </div>
    );
}

export default App;
