import { createUseStyles } from "react-jss";

const DARK_BG = "#1e1e1e";

/* interface CustomStylingProps {
    buttonBgColor?: string;
    paragraphColor?: string;
} */

/* const themeIsLight = (theme: string) => theme === "light";
export const formatProps = (theme: string): CustomStylingProps => ({
    buttonBgColor: themeIsLight(theme) ? "white" : DARK_BG,
    paragraphColor: themeIsLight(theme) ? "black" : "white",
}); */

export const useStyles = createUseStyles({
    "@global": {
        "@import":
            "url('https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap')",
    },
    crossmintButton: {
        display: "flex",
        "flex-direction": "row",
        "align-items": "center",
        padding: "0.875rem 0.875rem",
        "font-weight": "900",
        transition: "opacity ease-in-out 0.25s",
        "border-radius": "0.5rem",
        "font-family": `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif`,
        outline: "none",
        border: "none",
        "box-shadow": "0px 8px 15px rgba(0, 0, 0, 0.1)",
        "justify-content": "center",
        // background: ({ buttonBgColor }: CustomStylingProps) => buttonBgColor,
        background: DARK_BG,

        "&:hover:enabled": {
            opacity: "0.6",
            cursor: "pointer",
        },
    },
    crossmintImg: {
        width: "21px",
        height: "21px",
        "margin-right": "0.875rem",
    },
    crossmintParagraph: {
        // color: ({ paragraphColor }: CustomStylingProps) => paragraphColor,
        color: "white",
        margin: "0",
    },
});
