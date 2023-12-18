import { CrossmintPayButton } from "@crossmint/client-sdk-react-ui";

export default function Index() {
    return (
        <div
            style={{
                width: "100%",
                height: "100vh",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <CrossmintPayButton collectionId="<COLLECTION_ID>" projectId="<PROJECT_ID>" />
        </div>
    );
}
