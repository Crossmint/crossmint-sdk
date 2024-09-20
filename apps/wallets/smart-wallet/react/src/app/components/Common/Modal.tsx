import { Dialog, Transition } from "@headlessui/react";
import { XIcon } from "@heroicons/react/solid";
import { Fragment, type ReactNode } from "react";

import { classNames } from "../../utils/uiUtils";
import { SecondaryTitle } from "./Text";

export type ModalProps = {
    show: boolean;
    onClose?: () => void;
    children: ReactNode;
    size?: "2xl" | "xl" | "lg" | "md" | "sm";
    defaultPadding?: boolean;
    title?: string;
    className?: string;
    titleClassName?: string;
    modalClassName?: string;
    uncloseable?: boolean;
    closeOnOverlayClick?: boolean;
};

const getSize = (size: string) => `max-w-${size}`;

function Modal({
    show,
    onClose,
    size = "xl",
    children,
    defaultPadding,
    title,
    className,
    titleClassName,
    modalClassName,
    uncloseable = false,
    closeOnOverlayClick = true,
}: ModalProps) {
    const padding = defaultPadding === false ? "" : "lg:min-w-[600px] px-4 pt-6 pb-4 sm:p-8";
    const classes = classNames(
        `relative inline-block align-bottom bg-custom-background rounded-lg ${padding} text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle`,
        getSize(size),
        className
    );

    const titleClasses = classNames("flex items-center justify-between mb-10", titleClassName);

    return (
        <Transition.Root show={show} as={Fragment}>
            <Dialog
                as="div"
                className="fixed inset-0 z-20 overflow-y-auto"
                onClose={() => {
                    if (closeOnOverlayClick && onClose) {
                        onClose();
                    }
                }}
            >
                <div
                    className={classNames(
                        "flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0",
                        modalClassName
                    )}
                >
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Dialog.Overlay className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" />
                    </Transition.Child>

                    {/* This element is to trick the browser into centering the modal contents. */}
                    <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
                        &#8203;
                    </span>
                    <Transition.Child
                        as={Fragment}
                        enter="ease-out duration-200"
                        enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        enterTo="opacity-100 translate-y-0 sm:scale-100"
                        leave="ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                        leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    >
                        <div className={classes}>
                            {title && (
                                <div className={titleClasses}>
                                    <SecondaryTitle className="!mb-0">{title}</SecondaryTitle>
                                    {!uncloseable && (
                                        <XIcon
                                            className="w-5 cursor-pointer text-custom-text-tooltip"
                                            onClick={onClose}
                                        />
                                    )}
                                </div>
                            )}
                            {children}
                        </div>
                    </Transition.Child>
                </div>
            </Dialog>
        </Transition.Root>
    );
}

export default Modal;
