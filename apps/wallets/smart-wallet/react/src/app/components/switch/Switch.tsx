import type React from "react";
import { useState } from "react";

import { classNames } from "../../utils/uiUtils";

export default function Switch({
    id,
    className,
    style,
    onChange,
    checked: initialChecked,
}: {
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    onChange?: (checked: boolean) => void;
    checked?: boolean;
}) {
    const [checked, setChecked] = useState<boolean>(initialChecked || false);

    const toggleSwitch = () => {
        const newChecked = !checked;
        setChecked(newChecked);
        if (onChange) {
            onChange(newChecked);
        }
    };

    const switchClasses = classNames(
        "relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none",
        checked ? "bg-[rgb(39,130,114)]" : "bg-gray-200" // Custom color when the switch is on
    );

    const knobClasses = classNames(
        "transform transition ease-in-out duration-200",
        checked ? "translate-x-6" : "translate-x-1",
        "inline-block w-4 h-4 transform bg-white rounded-full"
    );

    return (
        <button
            id={id}
            className={`${switchClasses} ${className}`}
            style={style}
            role="switch"
            aria-checked={checked}
            onClick={toggleSwitch}
        >
            <span className={knobClasses} />
        </button>
    );
}
