import { tw } from "@/twind-instance";

interface PhoneOtpIconProps {
    customAccentColor?: string;
    customButtonBackgroundColor?: string;
    customBackgroundColor?: string;
}

export function PhoneOtpIcon({
    customAccentColor,
    customButtonBackgroundColor,
    customBackgroundColor,
}: PhoneOtpIconProps) {
    const accentColor = customAccentColor || "#04AA6D";
    const buttonBackgroundColor = customButtonBackgroundColor || "#eff6ff";
    const backgroundColor = customBackgroundColor || "#FFFFFF";

    return (
        <div className={tw("relative")}>
            {/* Phone icon with SMS bubble */}
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Background circle */}
                <circle cx="40" cy="40" r="40" fill={backgroundColor} />

                {/* Phone outline */}
                <rect
                    x="25"
                    y="15"
                    width="30"
                    height="50"
                    rx="4"
                    fill={buttonBackgroundColor}
                    stroke={accentColor}
                    strokeWidth="2"
                />

                {/* Phone screen */}
                <rect x="27" y="17" width="26" height="46" rx="2" fill={backgroundColor} />

                {/* SMS bubble */}
                <rect x="32" y="25" width="16" height="8" rx="4" fill={accentColor} />

                {/* SMS dots */}
                <circle cx="36" cy="29" r="1" fill={backgroundColor} />
                <circle cx="40" cy="29" r="1" fill={backgroundColor} />
                <circle cx="44" cy="29" r="1" fill={backgroundColor} />

                {/* Phone button */}
                <rect x="35" y="45" width="10" height="2" rx="1" fill={accentColor} />

                {/* Signal waves */}
                <path d="M55 30 Q60 30 60 35" stroke={accentColor} strokeWidth="2" fill="none" />
                <path d="M55 35 Q62 35 62 40" stroke={accentColor} strokeWidth="2" fill="none" />
                <path d="M55 40 Q64 40 64 45" stroke={accentColor} strokeWidth="2" fill="none" />
            </svg>
        </div>
    );
}
