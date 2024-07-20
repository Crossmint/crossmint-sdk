import Avatar from "@mui/material/Avatar";
import classNames from "classnames";
import { useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { AppContext } from "../../AppContext";
import { ReactComponent as CrossmintLogoOriginal } from "../../assets/icons/crossmint_logo_original.svg";
import { ReactComponent as CrossmintLogoWhite } from "../../assets/icons/crossmint_logo_white.svg";
import { ReactComponent as MintIcon } from "../../assets/icons/mint_icon.svg";
import { ReactComponent as WalletIcon } from "../../assets/icons/wallet_icon.svg";
import { firebaseAuth } from "../../auth/FirebaseAuthManager";
import { MarginLessSecondaryTitle, Paragraph, TerciaryTitle } from "../Common/Text";

const HeaderComponent = () => {
    const { isAuthenticated, value, setIsAuthenticated } = useContext(AppContext);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedTab, setSelectedTab] = useState(0);
    const navigate = useNavigate();
    const location = useLocation();

    const dropdownRef = useRef<HTMLDivElement>(null);

    const handleClickOutside = (event: Event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setShowDropdown(false);
        }
    };

    useEffect(() => {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        firebaseAuth().signOut();
        // purgeData(isProd);
        if (value === undefined) {
            setIsAuthenticated(false);
            navigate("/");
        }
        setShowDropdown(false);
        setIsAuthenticated(false);
        localStorage.setItem("isUserConnected", "false");
        navigate("/");
    };

    useEffect(() => {
        if (location.pathname === "/wallet") {
            setSelectedTab(1);
        } else if (location.pathname === "/mint") {
            setSelectedTab(0);
        } else if (location.pathname === "/") {
            setSelectedTab(3);
        }
    }, [location.pathname, isAuthenticated]);

    const handleTabChange = (event: any, newValue: any) => {
        setSelectedTab(newValue);
        if (newValue === 0) {
            navigate("/mint");
        } else if (newValue === 1) {
            navigate("/wallet");
        }
    };

    return (
        <div className="relative flex flex-col h-full z-20">
            <div
                className={classNames(
                    "flex items-center w-full justify-between md:justify-between h-[3.75rem] px-[1rem] md:px-14",
                    {
                        "border-b border-[#E7E9ED] bg-white": isAuthenticated,
                        "md:h-[6.75rem]": !isAuthenticated,
                    }
                )}
            >
                <div
                    className={classNames(
                        isAuthenticated ? "w-auto md:w-1/6" : "w-auto flex",
                        "justify-center items-center"
                    )}
                >
                    <div className="flex flex-row items-center space-x-2">
                        {isAuthenticated ? (
                            <CrossmintLogoOriginal className=" [&>path]:stroke-[2] h-[2rem] w-[2rem]" />
                        ) : (
                            <CrossmintLogoWhite className=" [&>path]:stroke-[2] h-[2rem] w-[2rem]" />
                        )}
                        <MarginLessSecondaryTitle
                            className={`!font-bold ${selectedTab === 3 ? "text-[#FFF]" : "text-[#20343E]"}`}
                        >
                            Crossmint
                        </MarginLessSecondaryTitle>
                        {!isAuthenticated && (
                            <>
                                <div className="border-r border-[#E7E9ED40] h-6 !mx-4 !mr-2" />
                                <Paragraph className="text-[#FFF] !text-lg !font-normal">AA Wallet Demo</Paragraph>
                            </>
                        )}
                    </div>
                </div>
                {isAuthenticated && (
                    <div className="hidden md:flex justify-center">
                        <div className="flex space-x-4">
                            {/* Mint tab for desktop */}
                            <div
                                className={`w-[7.5rem] text-center cursor-pointer flex-grow flex items-center justify-center pt-5 pb-[0.8rem] ${
                                    selectedTab === 0
                                        ? "text-[#278271] border-b-2 border-[#278271]"
                                        : "text-black border-b-2 border-white"
                                }`}
                                onClick={() => handleTabChange(null, 0)}
                            >
                                <MintIcon
                                    className={`h-[1.5rem] w-[1.5rem] ${
                                        selectedTab === 0 ? "fill-[#278271]" : "!fill-[#000]"
                                    }`}
                                />
                                <TerciaryTitle className="!mb-0 !font-semibold">Mint</TerciaryTitle>
                            </div>

                            {/* Wallet tab for desktop */}
                            <div
                                className={`w-[7.5rem] text-center cursor-pointer flex-grow flex items-center justify-center pt-5 pb-[0.8rem] ${
                                    selectedTab === 1
                                        ? "text-[#278271] border-b-2 border-[#278271]"
                                        : "text-black border-b-2 border-white"
                                }`}
                                onClick={() => handleTabChange(null, 1)}
                            >
                                <WalletIcon
                                    className={`[&>path]:stroke-[2] h-[1.5rem] w-[1.5rem] ${
                                        selectedTab === 1 ? "[&>path]:stroke-[#278271]" : "text-black"
                                    }`}
                                />
                                <TerciaryTitle className="!mb-0 !font-semibold">Wallet</TerciaryTitle>
                            </div>
                        </div>
                    </div>
                )}

                {isAuthenticated && (
                    <div className="w-auto md:w-1/6 flex justify-end">
                        <Avatar
                            alt="User Avatar"
                            src="/path-to-user-image.jpg"
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="cursor-pointer"
                        />
                        {showDropdown && (
                            <div
                                ref={dropdownRef}
                                className="absolute right-0 mt-10 mr-4 md:mr-12 w-24 bg-white border border-gray-200 rounded shadow-md"
                            >
                                <button
                                    onClick={handleLogout}
                                    className="block w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100"
                                >
                                    Log out
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs for mobile at the bottom */}
            {isAuthenticated && (
                <div className="md:hidden block w-full fixed bottom-0 left-0 bg-white border-t border-[#E7E9ED]">
                    <div className="flex justify-around items-center h-[4.25rem]">
                        {/* Mint tab for mobile */}
                        <div
                            className={`w-[7.5rem] text-center cursor-pointer flex items-center justify-center py-[1.375rem] ${
                                selectedTab === 0
                                    ? "text-[#278271] border-t-2 border-[#278271]"
                                    : "text-black border-t-2 border-[#E7E9ED]"
                            }`}
                            onClick={() => handleTabChange(null, 0)}
                        >
                            <MintIcon
                                className={`h-[1.5rem] w-[1.5rem] ${
                                    selectedTab === 0 ? "fill-[#278271]" : "!fill-[#000]"
                                }`}
                            />
                            <TerciaryTitle className="!mb-0 !font-semibold">Mint</TerciaryTitle>
                        </div>

                        {/* Wallet tab for mobile */}
                        <div
                            className={`w-[7.5rem] text-center cursor-pointer flex items-center justify-center py-[1.375rem] ${
                                selectedTab === 1
                                    ? "text-[#278271] border-t-2 border-[#278271]"
                                    : "text-black border-t-2 border-[#E7E9ED]"
                            }`}
                            onClick={() => handleTabChange(null, 1)}
                        >
                            <WalletIcon
                                className={`[&>path]:stroke-[2] h-[1.5rem] w-[1.5rem] ${
                                    selectedTab === 1 ? "[&>path]:stroke-[#278271]" : "text-black"
                                }`}
                            />
                            <TerciaryTitle className="!mb-0 !font-semibold">Wallet</TerciaryTitle>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HeaderComponent;
