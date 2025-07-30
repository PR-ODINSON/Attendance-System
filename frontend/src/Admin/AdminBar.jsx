import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useParams } from "react-router-dom";
import axios from "axios";
import { HOST } from "../utils/constants";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const AttendanceBarChart = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [employeeName, setEmployeeName] = useState("");
  const [loading, setLoading] = useState(true);
  const { employeeId } = useParams();

  const [month, setMonth] = useState(
    new Date().toLocaleString("default", { month: "long" })
  );
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchAttendance = async () => {
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

        if (!Array.isArray(data)) {
          setEmployeeName(data.name || "Employee");
          setAttendanceData([]); // no attendance
        } else {
          setEmployeeName(data.length > 0 ? data[0].name : "Employee");
          setAttendanceData(data);
        }
      } catch (error) {
        console.error("Error fetching attendance:", error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [employeeId]);

  if (loading) {
    return <p>Loading attendance data...</p>;
  }

  const generateWorkingDates = () => {
    const monthIndex = new Date(Date.parse(month + " 1, 2021")).getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    let workingDates = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDay = new Date(year, monthIndex, day).getDay();
      if (currentDay !== 0 && currentDay !== 6) {
        workingDates.push(
          new Date(year, monthIndex, day).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            timeZone: "Asia/Kolkata",
          })
        );
      }
    }

    return workingDates;
  };

  const workingDates = generateWorkingDates();

  const filteredAttendanceData = workingDates.map((date) => {
    const record = attendanceData.find(
      (data) =>
        new Date(data.date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          timeZone: "Asia/Kolkata",
        }) === date
    );
    return record || { date, status: "Absent" };
  });

  const barColors = filteredAttendanceData.map((data) =>
    data.status === "Present"
      ? "#4CAF50"
      : data.status === "Late"
      ? "#FFC107"
      : "#F44336"
  );

  const tooltipLabelCallback = (tooltipItem) => {
    const index = tooltipItem.dataIndex;
    const record = filteredAttendanceData[index];

    if (record.status === "Absent") return "Absent";

    return `Check-In: ${record.check_in_time || "N/A"} | Check-Out: ${
      record.check_out_time || "N/A"
    }`;
  };

  const data = {
    labels: workingDates,
    datasets: [
      {
        label: "Working Hours",
        data: filteredAttendanceData.map((entry) => {
          if (!entry.check_in_time || !entry.check_out_time) return 0;

          try {
            const [inH, inM, inS] = entry.check_in_time.split(":").map(Number);
            const [outH, outM, outS] = entry.check_out_time.split(":").map(Number);

            const dateObj = new Date(entry.date);
            const checkIn = new Date(dateObj);
            checkIn.setHours(inH, inM, inS || 0);

            const checkOut = new Date(dateObj);
            checkOut.setHours(outH, outM, outS || 0);

            const diff = (checkOut - checkIn) / (1000 * 60 * 60); // in hours
            return diff > 0 && diff < 24 ? diff : 0;
          } catch {
            return 0;
          }
        }),
        backgroundColor: barColors,
        borderRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: tooltipLabelCallback,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        title: {
          display: true,
          text: "Working Hours",
        },
      },
    },
  };

  const handleMonthChange = (e) => {
    setMonth(e.target.value);
  };

  const handleYearChange = (e) => {
    setYear(e.target.value);
  };

  return (
    <div className="bg-white p-4 shadow-lg rounded-lg w-full">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        {employeeName}&apos;s Attendance Overview ({month} {year})
      </h2>

      <div className="mb-4 flex gap-4">
        <label className="block mb-2">
          Month:
          <input
            type="text"
            value={month}
            onChange={handleMonthChange}
            placeholder="Enter month (e.g., January)"
            className="border rounded p-2 w-full"
          />
        </label>
        <label className="block mb-2">
          Year:
          <input
            type="number"
            value={year}
            onChange={handleYearChange}
            placeholder="Enter year (e.g., 2023)"
            className="border rounded p-2 w-full"
          />
        </label>
      </div>

      <Bar data={data} options={options} />
    </div>
  );
};

export default AttendanceBarChart;
