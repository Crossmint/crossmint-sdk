import type { SVGProps } from "react";

import { isEmpty } from "../../utils/stringUtils";
import { classNames } from "../../utils/uiUtils";

export type TabId = string | number;

export interface Tab {
    name: string;
    id: TabId;
    Icon?: (props: SVGProps<SVGSVGElement>) => JSX.Element;
    link?: string;
}

type Types = "primary" | "secondary" | "button" | "custom";
type Viewports = "mobile" | "desktop" | "both";

interface TabProps {
    onChange?: (tabId: TabId) => void;
    selectedTab: TabId;
    type?: Types;
    itemClassName?: string;
    viewport?: Viewports;
    containerClassName?: string;
    activeTabClassname?: string;
    inactiveTabClassname?: string;
    customTabText?: string;
}

interface Props extends TabProps {
    tabs: Tab[];
    tabClasses?: string;
}

export default function Tabs({
    tabs = [],
    selectedTab,
    onChange,
    type = "primary",
    itemClassName,
    viewport = "both",
    tabClasses,
    containerClassName,
    activeTabClassname,
    inactiveTabClassname,
    customTabText,
}: Props) {
    const isTabSelected = (tabId: TabId) => tabId === selectedTab;
    const isViewportDesktop = viewport === "desktop";

    const isButton = type === "button";
    const isCustom = type === "custom";

    const buttonNavWrapper = "justify-between";

    const mainWidth = isEmpty(containerClassName) ? "" : containerClassName;

    return (
        <div className={mainWidth}>
            {/* MOBILE */}
            <div className={classNames(isViewportDesktop ? "hidden" : "sm:hidden")}>
                <label htmlFor="tabs" className="sr-only">
                    Select a tab
                </label>
                <select
                    id="tabs"
                    name="tabs"
                    className="block w-full py-2 pl-3 pr-10 text-base border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    defaultValue={tabs.find(({ id }) => isTabSelected(id))?.name}
                    onChange={(e) => onChange && onChange(e.target.value)}
                >
                    {tabs.map((tab) => (
                        <option key={tab.name} value={tab.id}>
                            {tab.name}
                        </option>
                    ))}
                </select>
            </div>
            {/* DESKTOP */}
            <div className={classNames(isViewportDesktop ? "block" : "hidden desktop-tabs sm:block")}>
                <div className={classNames(isButton || isCustom ? "" : "border-b border-gray-200")}>
                    <nav
                        className={classNames(
                            "flex flex-grow -mb-px space-x-8",
                            isButton ? buttonNavWrapper : "",
                            tabClasses
                        )}
                        aria-label="Tabs"
                    >
                        {tabs.map((tab) => (
                            <TabItem
                                key={tab.id}
                                tab={tab}
                                selectedTab={selectedTab}
                                itemClassName={itemClassName}
                                type={type}
                                onChange={onChange}
                                activeTabClassname={activeTabClassname}
                                inactiveTabClassname={inactiveTabClassname}
                                customTabText={customTabText}
                            />
                        ))}
                    </nav>
                </div>
            </div>
        </div>
    );
}

interface TabItemProps extends TabProps {
    tab: Tab;
}

function TabItem({
    tab,
    selectedTab,
    type,
    itemClassName,
    onChange,
    activeTabClassname,
    inactiveTabClassname,
    customTabText,
}: TabItemProps) {
    const isTabSelected = (tabId: TabId) => tabId === selectedTab;
    const isSelected = isTabSelected(tab.id);

    const primaryText = "font-semibold text-[17px]";
    const primaryTextSelected = "text-black";

    const secondaryText = "text-sm";
    const secondaryTextSelected = "text-[#53C6A3]";

    const buttonText =
        "text-custom-text-secondary w-full text-center !ml-0 first:rounded-tl-lg last:rounded-tr-lg bg-custom-background-light border-b-4";
    const buttonTextSelected = "font-bold !bg-custom-background !text-custom-text-primary";

    const getDynamicStyles = (tab: Tab) => {
        switch (type) {
            case "primary":
                return isSelected ? classNames(primaryText, primaryTextSelected) : primaryText;
            case "secondary":
                return isSelected ? classNames(secondaryText, secondaryTextSelected) : secondaryText;
            case "button":
                return isSelected ? classNames(buttonText, buttonTextSelected) : buttonText;
            case "custom":
                return customTabText;
            default:
                throw new Error(`Wrong type ${type}`);
        }
    };

    const content = (
        <>
            {tab.Icon && <tab.Icon className={classNames("w-5 h-5 mr-2", isSelected ? "text-link" : "")} />}
            <p aria-current={isSelected ? "page" : undefined} role="tab">
                {tab.name}
            </p>
        </>
    );

    const defaultTabClass = "whitespace-nowrap py-4 px-1 border-b-2";
    const itemBottomBorder = !activeTabClassname && defaultTabClass;

    const selectedItemClassName = classNames(activeTabClassname ? activeTabClassname : "border-custom-primary");

    const notSelectedItemClassName = classNames(
        inactiveTabClassname
            ? inactiveTabClassname
            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer"
    );

    return (
        <div
            className={classNames(
                "flex justify-center items-center",
                isSelected ? selectedItemClassName : notSelectedItemClassName,
                itemBottomBorder,
                getDynamicStyles(tab),
                itemClassName
            )}
            key={tab.id}
            onClick={() => onChange && onChange(tab.id)}
        >
            {tab.link && !isSelected ? (
                <a className="flex items-center justify-center" href={tab.link}>
                    {content}
                </a>
            ) : (
                content
            )}
        </div>
    );
}
