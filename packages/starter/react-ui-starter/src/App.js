import { CrossmintPayButton } from "@crossmint/client-sdk-react-ui";

function App() {
    return (
        <div
            style={{ width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}
        >
            <CrossmintPayButton
                clientId="<YOUR_CLIENT_ID>"
            />
        </div>
    );
}

export default App;
