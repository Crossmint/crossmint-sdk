import type { IconProps } from "./types";
import { PngIcon } from "./PngIcon";

export function XIcon({ size = 16, color, strokeWidth = 2 }: IconProps) {
    void strokeWidth;
    return <PngIcon source={require("./assets/x.png")} size={size} color={color} />;
}
