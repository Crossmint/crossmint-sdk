import { Dialog, Transition } from "@headlessui/react";
import { CSSProperties, Fragment, ReactNode } from "react";

export type ActionModalProps = {
    show: boolean;
    onClose?: () => void;
};

export default function ActionModal({
    show,
    onClose = () => {},
    children,
}: ActionModalProps & { children: ReactNode }) {
    // WAL-2574 - because of a recent change from another sdk in @headlessui/react, this file started complaining about the types
    return (
        <Transition.Root show={show} as={Fragment}>
            <Dialog as="div" style={styles.dialog} onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-400"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-400"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div style={styles.transitionBegin} onClick={onClose} />
                </Transition.Child>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-400"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-400"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                >
                    <div style={styles.transitionEnd} onClick={(e) => e.stopPropagation()}>
                        {children}
                    </div>
                </Transition.Child>
            </Dialog>
        </Transition.Root>
    );
}

const styles: { [key: string]: CSSProperties } = {
    dialog: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflowY: "auto",
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 20,
    },
    transitionBegin: {
        background: "rgba(139, 151, 151, 0.2)",
        filter: "blur(4px)",
        position: "fixed",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        transitionProperty: "opacity",
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        transitionDuration: "300ms",
        zIndex: -10,
    },
    transitionEnd: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1.25rem",
        margin: "1.5rem",
        borderRadius: "0.75rem",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        zIndex: 30,
    },
};
