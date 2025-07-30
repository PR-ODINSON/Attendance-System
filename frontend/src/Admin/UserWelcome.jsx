import axios from "axios";
import { HOST } from "../utils/constants";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const UserWelcome = () => {
  const [name, setName] = useState("Loading...");
  const { employeeId } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${HOST}/api/attendance/admin/${employeeId}`,
          {
            withCredentials: true,
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = response.data;
        console.log("API Response:", data);

        if (Array.isArray(data) && data.length > 0) {
          // Attendance present with name
          setName(data[0].name || "Unnamed");
        } else if (data && typeof data === "object" && data.name) {
          // Only name and email returned
          setName(data.name);
        } else {
          setName("No Name Found");
        }
      } catch (error) {
        console.error("Error fetching name:", error);
        setName("Error Fetching Name");
      }
    };

    if (employeeId) {
      fetchData();
    }
  }, [employeeId]);

  return (
    <div className="w-full flex flex-col items-center px-4">
      <h1 className="text-2xl font-bold text-gray-800 montserrat">
        Overview for {name}
      </h1>
    </div>
  );
};

export default UserWelcome;
