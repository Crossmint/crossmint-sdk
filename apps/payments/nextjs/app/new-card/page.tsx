"use client";

import { CrossmintProvider, CrossmintNewCard } from "@crossmint/client-sdk-react-ui";

export default function NewCardPage() {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "start",
                padding: "20px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "start",
                    width: "100%",
                    maxWidth: "450px",
                }}
            >
                <CrossmintProvider apiKey="ck_development_5ZUNkuhjP8aYZEgUTDfWToqFpo5zakEqte1db4pHZgPAVKZ9JuTQKmeRbn1gv7zYCoZrRNYy4CnM7A3AMHQxFKA2BsSVeZbKEvXXY7126Th68mXhTg6oxHJpC2kuw9Q1HasVLX9LM67FoYSTRtTUUEzP93GUSEmeG5CZG7Lbop4oAQ7bmZUKTGmqN9L9wxP27CH13WaTBsrqxUJkojbKUXEd">
                    <CrossmintNewCard
                        onCardTokenized={(cardToken) => {
                            console.log("card tokenized", cardToken);
                        }}
                    />
                </CrossmintProvider>
            </div>
        </div>
    );
}
