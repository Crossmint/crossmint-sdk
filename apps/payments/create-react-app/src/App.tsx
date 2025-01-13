import { CrossmintPayButton_DEPRECATED as CrossmintPayButton } from "@crossmint/client-sdk-react-ui";

function App() {
    return (
        <div
            style={{ width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}
        >
            <CrossmintPayButton collectionId="<COLLECTION_ID>" projectId="<PROJECT_ID>" />
        </div>
    );
}

export default App;
