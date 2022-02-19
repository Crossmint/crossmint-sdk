import { CrossMintButtonTest } from "@crossmint/client-sdk-react-ui";

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
            <CrossMintButtonTest
                collectionTitle="<TITLE_FOR_YOUR_COLLECTION>"
                collectionDescription="<DESCRIPTION_OF_YOUR_COLLECTION>"
                collectionPhoto="<OPT_URL_TO_PHOTO_COVER>"
                clientId="12345"
                crossmintOpened={() => console.log('opened!!!!')}
                crossmintClosed={() => console.log('closed!!')}
            />
        </div>
    );
}
