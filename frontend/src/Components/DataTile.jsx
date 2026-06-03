import { useEffect, useState } from "react";
import axios from "axios";
import { HOST } from "../utils/constants";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const DataTile = () => {
  const [attendance, setAttendance] = useState({
    Present: 0,
    Absent: 0,
    Late: 0,
    "Left Early": 0,
  });
  const [totalWorkingDays, setTotalWorkingDays] = useState(0);

  const email = localStorage.getItem("email");

  const isCurrentMonthAttendance = (item) => {
    const today = new Date();
    const itemDate = new Date(item.date);

    return (
      !Number.isNaN(itemDate.getTime()) &&
      itemDate.getFullYear() === today.getFullYear() &&
      itemDate.getMonth() === today.getMonth()
    );
  };

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
        const attendanceData = response.data.filter(isCurrentMonthAttendance);

        const summary = {
          Present: attendanceData.filter((item) => item.status === "Present").length,
          Absent: attendanceData.filter((item) => item.status === "Absent").length,
          Late: attendanceData.filter((item) => item.status === "Late").length,
          "Left Early": attendanceData.filter((item) => item.status === "Left Early").length,
        };

        setAttendance(summary);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      }
    };

    const calculateWorkingDays = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth(); // 0-indexed (0 = January)
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      let workingDays = 0;

      for (let day = 1; day <= daysInMonth; day++) {
        const currentDay = new Date(year, month, day).getDay();
        if (currentDay !== 0 && currentDay !== 6) {
          // Excluding Sundays (0) & Saturdays (6)
          workingDays++;
        }
      }

      setTotalWorkingDays(workingDays);
    };

    fetchAttendance();
    calculateWorkingDays();
  }, []);

  const data = [
    { name: "Present", value: attendance.Present },
    { name: "Absent", value: attendance.Absent },
    { name: "Late", value: attendance.Late },
    { name: "Left Early", value: attendance["Left Early"] },
  ];

  const COLORS = ["#4CAF50", "#FF5733", "#FFC107", "#FF9800"];
  const monthName = new Date().toLocaleString("default", { month: "long" });

  return (
    <div className="w-full bg-white p-5 rounded-lg shadow-sm border border-gray-100 openSans">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-[#00416A]">
          Attendance Summary of {monthName}
        </h2>
      </div>

      <div className="w-full flex items-center justify-between gap-6">
        <div className="flex flex-col justify-center items-center min-w-[260px]">
          <PieChart width={300} height={205}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={72}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: "#fff", borderRadius: "8px", padding: "8px", border: "1px solid #e5e7eb" }} />
            <Legend align="center" verticalAlign="bottom" layout="horizontal" iconSize={11} wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }} />
          </PieChart>
        </div>

        <div className="ml-auto w-52 shrink-0 rounded-lg bg-gray-50 border border-gray-100 px-4 py-4 text-sm text-gray-600">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
            <span className="font-semibold">Working Days</span>
            <span className="text-xl font-bold text-[#00416A]">{totalWorkingDays}</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Present</span>
              <span className="font-semibold text-[#4CAF50]">{attendance.Present}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Absent</span>
              <span className="font-semibold text-[#FF5733]">{attendance.Absent}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Late</span>
              <span className="font-semibold text-[#B98500]">{attendance.Late}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Left Early</span>
              <span className="font-semibold text-[#FF9800]">{attendance["Left Early"]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTile;
