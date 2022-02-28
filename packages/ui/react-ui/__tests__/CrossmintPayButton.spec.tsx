import React from "react";
import { render, fireEvent, screen, act } from "@testing-library/react";
import "@testing-library/jest-dom";

import { CrossmintPayButton } from "../src/CrossmintPayButton";
import { LIB_VERSION } from "../src/version";

const fetchReturns = Promise.resolve({
    json: () => Promise.resolve({}),
}) as any;
global.fetch = jest.fn(() => fetchReturns);

const openReturns = {} as Window;
global.open = jest.fn(() => openReturns);

describe("CrossmintPayButton", () => {
    test("should open window with correct url", async () => {
        const props = {
            collectionTitle: "CollectionTitle",
            collectionDescription: "CollectionDescription",
            collectionPhoto: "CollectionPhoto",
            clientId: "a4e1bfcc-9884-11ec-b909-0242ac120002",
        };
        render(<CrossmintPayButton {...props} />);

        await act(async () => {
            fireEvent.click(screen.getByText("Buy with credit card"));
        });
        expect(global.open).toHaveBeenCalledWith(
            `https://www.crossmint.io/signin?callbackUrl=https%3A%2F%2Fwww.crossmint.io%2Fcheckout%2Fmint%3FclientId%3D${encodeURIComponent(
                props.clientId
            )}%26closeOnSuccess%3Dfalse%26clientName%3Dclient-sdk-react-ui%26clientVersion%3D${LIB_VERSION}%26mintConfig%3D%257B%2522type%2522%253A%2522candy-machine%2522%257D%26collectionTitle%3D${encodeURIComponent(
                props.collectionTitle
            )}%26collectionDescription%3D${encodeURIComponent(
                props.collectionDescription
            )}%26collectionPhoto%3D${encodeURIComponent(props.collectionPhoto)}`,
            "popUpWindow",
            "height=750,width=400,left=312,top=9,resizable=yes,scrollbars=yes,toolbar=yes,menubar=true,location=no,directories=no, status=yes"
        );
    });
});
