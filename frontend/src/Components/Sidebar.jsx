import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InSolareLogo from "../assets/Logo/insolare-logo-image.png";

const Sidebar = () => {
    const [activeLink, setActiveLink] = useState("Dashboard");
    const navigate = useNavigate();

    const handleLinkClick = (link) => {
        setActiveLink(link);
        navigate(`/${link.toLowerCase()}`);
    };

    return (
        <div className="w-1/6 min-h-screen p-3 bg-gradient-to-b from-[#00416A] to-[#003558] text-white poppins text-base fixed top-0 left-0 z-10 shadow-2xl">
            {/* Logo Section */}
            <div className="mb-6 relative">
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl p-3 shadow-lg relative overflow-hidden">
                    {/* Subtle yellow accent */}
                    <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-bl-xl opacity-20"></div>
                    <img
                        src={InSolareLogo}
                        alt="InSolare Logo"
                        className="w-full h-auto"
                    />
                </div>
            </div>

            {/* Navigation Menu */}
            <ul className="flex flex-col w-full gap-2">
                <li
                    onClick={() => handleLinkClick("Dashboard")}
                    className={`group relative p-3 cursor-pointer rounded-lg transition-all duration-300 ${
                        activeLink === "Dashboard"
                            ? 'bg-gradient-to-r from-[#0064a2] to-[#0078c7] shadow-lg'
                            : 'hover:bg-gradient-to-r hover:from-[#0064a2] hover:to-[#0078c7] hover:shadow-md'
                    }`}
                >
                    {/* Active indicator */}
                    {activeLink === "Dashboard" && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-r-full"></div>
                    )}
                    <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></div>
                        <span className="font-medium">Dashboard</span>
                    </div>
                </li>

                <li
                    onClick={() => handleLinkClick("History")}
                    className={`group relative p-3 cursor-pointer rounded-lg transition-all duration-300 ${
                        activeLink === "History"
                            ? 'bg-gradient-to-r from-[#0064a2] to-[#0078c7] shadow-lg'
                            : 'hover:bg-gradient-to-r hover:from-[#0064a2] hover:to-[#0078c7] hover:shadow-md'
                    }`}
                >
                    {/* Active indicator */}
                    {activeLink === "History" && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-r-full"></div>
                    )}
                    <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></div>
                        <span className="font-medium">History</span>
                    </div>
                </li>

                <li
                    onClick={() => handleLinkClick("Settings")}
                    className={`group relative p-3 cursor-pointer rounded-lg transition-all duration-300 ${
                        activeLink === "Settings"
                            ? 'bg-gradient-to-r from-[#0064a2] to-[#0078c7] shadow-lg'
                            : 'hover:bg-gradient-to-r hover:from-[#0064a2] hover:to-[#0078c7] hover:shadow-md'
                    }`}
                >
                    {/* Active indicator */}
                    {activeLink === "Settings" && (
                        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-yellow-400 to-yellow-500 rounded-r-full"></div>
                    )}
                    <div className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full opacity-60 group-hover:opacity-100 transition-opacity"></div>
                        <span className="font-medium">Settings</span>
                    </div>
                </li>
            </ul>

            {/* Bottom accent */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent opacity-30"></div>
        </div>
    );
};

export default Sidebar;
