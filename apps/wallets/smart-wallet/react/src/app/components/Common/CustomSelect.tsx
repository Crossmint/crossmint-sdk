import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/outline";
import React, { useRef, useState } from "react";

import { classNames } from "../../utils/uiUtils";
import { Paragraph } from "./Text";

interface OptionType {
    name: string;
    symbol: string;
    balance: string;
}

interface SelectProps {
    options: OptionType[];
    label?: string;
    selected: any;
    onSelect: (value: any) => void;
}

export const CustomSelect = ({ options, label, selected, onSelect }: SelectProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<any>(null);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleOutsideClick = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    React.useEffect(() => {
        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, []);

    return (
        <div className={classNames("relative", "space-y-3")} ref={containerRef}>
            {label && <Paragraph className="!text-custom-text-primary font-semibold justify-start">{label}</Paragraph>}
            <div
                className={classNames(
                    "flex h-10 border transition",
                    "rounded-md cursor-pointer",
                    isOpen && "border-link"
                )}
                onClick={toggleDropdown}
            >
                <div className="py-2.5 px-2 text-sm h-full rounded-md flex-grow">{selected}</div>
                <div className="py-2.5 px-2 h-full">
                    {isOpen ? (
                        <ChevronUpIcon className="w-4 h-4 text-custom-text-secondary" />
                    ) : (
                        <ChevronDownIcon className="w-4 h-4 text-custom-text-secondary" />
                    )}
                </div>
            </div>
            {isOpen && (
                <div className="absolute w-full mt-2 rounded-md shadow-lg bg-white z-10">
                    {options.map((option, index) => (
                        <div
                            key={index}
                            className={classNames(
                                "py-2 px-4 hover:bg-gray-200 cursor-pointer",
                                selected === option.name && "bg-gray-100"
                            )}
                            onClick={() => {
                                onSelect(option.name);
                                setIsOpen(false);
                            }}
                        >
                            {option.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
