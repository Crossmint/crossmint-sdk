import type { IconProps } from "./types";
import { PngIcon } from "./PngIcon";

export function MailIcon({ size = 22, color = "currentColor", strokeWidth = 2 }: IconProps) {
    void strokeWidth;
    return <PngIcon source={require("./assets/mail.png")} size={size} color={color} />;
}
