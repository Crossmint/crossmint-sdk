import styled, { css } from "styled-components";

const DARK_BG = "#1e1e1e";

export const Button = styled.button`
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 0.875rem 0.875rem;
    font-weight: 900;
    transition: opacity ease-in-out 0.25s;
    border-radius: 0.5rem;
    font-family: "Gilroy", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans",
        "Helvetica Neue", sans-serif;
    outline: none;
    border: none;
    box-shadow: 0px 8px 15px rgba(0, 0, 0, 0.1);
    justify-content: center;

    &:hover:enabled {
        opacity: 0.6;
        cursor: pointer;
    }

    ${(props) =>
        props.theme === "light"
            ? css`
                  background: white;
              `
            : css`
                  background: ${DARK_BG};
              `}
`;

export const Paragraph = styled.p`
    margin: 0;

    ${(props) =>
        props.theme === "light"
            ? css`
                  color: black;
              `
            : css`
                  color: white;
              `}
`;

export const Img = styled.img`
    width: 21px;
    height: 21px;
    margin-right: 0.875rem;
`;
