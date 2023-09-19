import { css } from "lit";

export const hostedCheckoutButtonStyles = css`
    button {
        display: flex;
        flex-direction: row;
        align-items: center;
        padding: 0.875rem 0.875rem;
        font-weight: 900;
        transition: opacity ease-in-out 0.25s;
        border-radius: 0.5rem;
        font-family: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Open Sans,
            Helvetica Neue, sans-serif;
        outline: none;
        border: none;
        box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.1);
        justify-content: center;
        background: #1e1e1e;
        color: white;
    }
    button.light {
        background: white;
    }

    button:hover:enabled {
        opacity: 0.6;
        cursor: pointer;
    }

    img {
        width: 21px;
        height: 21px;
        margin-right: 0.875rem;
    }

    p {
        color: white;
        margin: 0;
    }

    button.light p {
        color: black;
    }
`;
