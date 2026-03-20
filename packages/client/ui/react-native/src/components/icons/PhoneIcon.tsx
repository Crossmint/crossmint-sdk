import type { IconProps } from "./types";
import { PngIcon } from "./PngIcon";

export function PhoneIcon({ size = 22, color = "currentColor", strokeWidth = 2 }: IconProps) {
    void strokeWidth;
    return <PngIcon source={require("./assets/phone.png")} size={size} color={color} />;
}
