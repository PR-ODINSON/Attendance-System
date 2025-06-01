import axios from "axios";
import { HOST } from "../utils/constants";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons";

const NavBar = () => {
  const [name, setName] = useState("");
  const [profilePhoto, setProfilePhoto] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(`${HOST}/api/user/get-user-name`,{
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        setName(response.data.name);
        const photoResponse = await axios.get(`${HOST}/api/user/profilePhoto`, {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        setProfilePhoto(photoResponse.data.profilePhoto);
      } catch (error) {
        console.error("Error fetching name or profile photo:", error);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    try {
      const response = await axios.post(
        `${HOST}/api/auth/logout`,
        {},
        {
          withCredentials: true,
        }
      );

      if (response.status === 200) {
        // Clear any client-side storage if needed
        localStorage.clear();
        sessionStorage.clear();

        // Navigate to login page
        navigate("/");
      }
    } catch (error) {
      console.error(
        "Error logging out:",
        error.response?.data || error.message
      );
      alert("Failed to logout. Please try again.");
    }
  };
  const extractNameFromImage = (imageName) => {
    if (!imageName) return "";
    return imageName.split("_")[0];
  };

  return (
    <div className="w-full flex justify-end items-center px-6 py-4 bg-white gap-3 openSans relative">
      <span>{name}</span>
      {profilePhoto.length > 0 && (
        <img
          src={`/uploads/${extractNameFromImage(profilePhoto[0])}/${
            profilePhoto[0]
          }`}
          alt="Profile"
          className="w-8 h-8 rounded-full bg-cover"
        />
      )}
      <div
        className="cursor-pointer"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <FontAwesomeIcon icon={faEllipsisV} />
      </div>
      {isDropdownOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white shadow-lg rounded-md">
          <a
            href="#"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={handleLogout}
          >
            Logout
          </a>
        </div>
      )}
    </div>
  );
};

export default NavBar;
