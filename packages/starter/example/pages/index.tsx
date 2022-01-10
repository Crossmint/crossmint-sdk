import { CrossMintButton } from "@crossmint/client-sdk-react-ui";

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
            <CrossMintButton
                collectionTitle="Test Collection"
                collectionDescription="This is a CrossMint test collection!"
                collectionPhoto="https://picsum.photos/300"
            />
        </div>
    );
}
