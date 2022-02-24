import { CrossmintPayButton } from "@crossmint/client-sdk-react-ui";

export default function Index() {
    return (
        <div>
            <CrossmintPayButton
                collectionTitle="<TITLE_FOR_YOUR_COLLECTION>"
                collectionDescription="<DESCRIPTION_OF_YOUR_COLLECTION>"
                collectionPhoto="<OPT_URL_TO_PHOTO_COVER>"
                clientId="<YOUR_CLIENT_ID>"
            />
        </div>
    );
}
