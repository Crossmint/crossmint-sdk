import { CrossMintButton } from "@crossmint/mint-adapter-react-ui";

export default function Index(): JSX.IntrinsicAttributes {
    return (
        <div
            style={{ width: "100%", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}
        >
            <CrossMintButton
                candyMachineId="<CANDY_MACHINE_ID>"
                collectionTitle="<TITLE_FOR_YOUR_COLLECTION>"
                collectionDescription="<DESCRIPTION_OF_YOUR_COLLECTION>"
                collectionPhoto="<URL_TO_A_PHOTO>"
            />
        </div>
    );
}
