import { Image, type ImageSourcePropType } from "react-native";
import type { IconProps } from "./types";

interface PngIconProps extends IconProps {
    source: ImageSourcePropType;
}

export function PngIcon({ source, size = 22, color }: PngIconProps) {
    const normalizedSource = typeof source === "string" ? { uri: source } : source;

    return (
        <Image
            source={normalizedSource}
            resizeMode="contain"
            style={{
                width: size,
                height: size,
                tintColor: color,
            }}
        />
    );
}
