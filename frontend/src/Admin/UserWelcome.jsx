import axios from "axios";
import { HOST } from "../utils/constants";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const UserWelcome = () => {
  const [name, setName] = useState("");
  const { employeeId } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${HOST}/api/attendance/admin/${employeeId}`,
          {
            withCredentials: true, // Enable sending cookies
            headers: {
              "Content-Type": "application/json",
            },
          }
        );
        console.log("API Response:", response.data);

        if (response.data) {
          setName(response.data[0].name);
        } else {
          console.warn("No attendance data found for this employee.");
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
