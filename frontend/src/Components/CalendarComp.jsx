import { useState, useEffect } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../assets/stylesheets/calendar.css";
import axios from "axios";
import { HOST } from "../utils/constants";

const CalendarComp = () => {
  const [date, setDate] = useState(new Date());
  const [attendance, setAttendance] = useState({});

  const email = localStorage.getItem("email");

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const response = await axios.get(`${HOST}/api/attendance/get-user-attendance`, {
          params: { email },
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log("Fetched Attendance Data:", response.data);

        const attendanceMap = {};
        response.data.forEach((entry) => {
          const correctedDate = new Date(entry.date);
          const formattedDate = correctedDate
            .toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" })
            .split("/")
            .reverse()
            .join("-");
          attendanceMap[formattedDate] = {
            status: entry.status,
            checkInTime: entry.check_in_time,
            checkOutTime: entry.check_out_time,
          };
        });
        setAttendance(attendanceMap);
      } catch (error) {
        console.error("Error fetching attendance:", 
          error.response?.data?.error || error.message
        );
      }
    };

    fetchAttendance();
  }, []);

  return (
    <Calendar
      onChange={setDate}
      value={date}
      tileClassName={({ date }) => {
        const dateString = date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }).split("/").reverse().join("-");
        const status = attendance[dateString];

        if (status) {
          return `status-${status.status.toLowerCase()}`;
        }
        return "";
      }}
      tileContent={({ date }) => {
        const dateString = date.toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }).split("/").reverse().join("-");
        const status = attendance[dateString];

        return status ? (
          <div className={`attendance-dot dot-${status.status.toLowerCase()}`} title={`Status: ${status.status}\nCheck In Time: ${status.checkInTime}\nCheck Out Time: ${status.checkOutTime}`}></div>
        ) : null;
      }}
    />
  );
};

export default CalendarComp;
