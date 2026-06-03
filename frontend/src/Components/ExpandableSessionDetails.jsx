import React, { useState } from "react";
import axios from "axios";
import { HOST } from "../utils/constants";

const ExpandableSessionDetails = ({ employeeId, date = null }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(
    date || new Date().toISOString().split("T")[0]
  );
  const [employeeName, setEmployeeName] = useState("");
  const [downloadPeriod, setDownloadPeriod] = useState("today");

  const fetchSessionDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${HOST}/api/attendance/session-details/${employeeId}`,
        {
          params: {
            date: selectedDate,
          },
          withCredentials: true,
        }
      );
      setSessions(response.data);
    } catch (err) {
      console.error("Error fetching session details:", err);
      setError("Failed to load session details");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleExpand = () => {
    if (!isExpanded) {
      fetchSessionDetails();
      fetchEmployeeName();
    }
    setIsExpanded(!isExpanded);
  };

  const fetchEmployeeName = async () => {
    try {
      const response = await axios.get(
        `${HOST}/api/user/get-user-details`,
        { withCredentials: true }
      );
      setEmployeeName(response.data.name);
    } catch (err) {
      console.error("Error fetching employee name:", err);
    }
  };

  // Helper to determine out-time color based on duration
  const getOutTimeColorClass = (minutes) => {
    if (minutes === null || minutes === undefined) return "text-gray-400";
    if (minutes <= 60) return "bg-green-50 text-green-700"; // Normal break
    if (minutes <= 120) return "bg-amber-50 text-amber-700"; // Extended break
    return "bg-red-50 text-red-700"; // Long gap
  };

  // Download session data as CSV with period selection
  const downloadSessionData = async () => {
    if (!employeeId) {
      alert("Employee details are not available");
      return;
    }

    try {
      const response = await axios.get(
        `${HOST}/api/attendance/session-download/${employeeId}`,
        {
          params: { period: downloadPeriod },
          withCredentials: true
        }
      );

      const downloadedSessions = response.data.sessions || [];

      if (downloadedSessions.length === 0) {
        alert("No data available for the selected period");
        return;
      }

      const headers = [
        "Employee ID",
        "Employee Name",
        "Date",
        "Session #",
        "Check-In",
        "Check-Out",
        "Duration",
        "Out Time",
        "Status",
      ];
      const displayName = response.data.employeeName || employeeName || "Employee";
      const rows = downloadedSessions.map((session) => [
        employeeId,
        displayName,
        session.date,
        session.sequence,
        session.check_in || "-",
        session.check_out || "-",
        session.duration_formatted || "-",
        session.out_time_formatted || "-",
        session.status
      ]);

      const periodLabel = downloadPeriod.charAt(0).toUpperCase() + downloadPeriod.slice(1);
      const csvContent = [
        [
          `Employee: ${displayName} (${employeeId})`,
          `Period: ${periodLabel}`,
          `Generated: ${new Date().toLocaleString()}`
        ].join(","),
        "",
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);

      const filename = `session_data_${displayName.replace(/\s+/g, "_")}_${downloadPeriod}.csv`;
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading session data:", err);
      alert("Failed to download session data");
    }
  };

  return (
    <div className="w-full px-12 py-6 bg-blue-50 rounded-xl shadow-md mt-6">
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center justify-between py-3 px-4 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-bold text-[#00416A] montserrat">
            Detailed Sessions
          </h3>
          {sessions && (
            <span className="text-sm bg-[#FFC107] text-[#00416A] px-3 py-1 rounded-full font-semibold">
              {sessions.total_sessions}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-[#00416A] transition-transform duration-300 ${
            isExpanded ? "rotate-180" : ""
          }`}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <polygon points="12,18 4,8 20,8" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-semibold text-[#00416A] montserrat">
                Select Date:
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setSessions(null);
                }}
                className="mt-2 px-3 py-2 border border-gray-300 rounded-lg w-full focus:outline-none focus:border-[#0064a2]"
              />
            </div>
          </div>

          {!sessions && !loading && (
            <div className="flex">
              <button
                onClick={fetchSessionDetails}
                className="px-6 py-2 bg-[#0064a2] text-white rounded-lg hover:bg-[#00416A] transition-colors font-semibold"
              >
                Load Sessions
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-6 text-gray-500">
              Loading sessions...
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded-md mb-4">
              {error}
            </div>
          )}

          {sessions && !loading && (
            <div>
              <div className="overflow-x-auto">
                {sessions.total_sessions === 0 ? (
                  <p className="text-center py-4 text-gray-500">
                    No sessions recorded for {selectedDate}
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#00416A] text-white">
                        <th className="px-4 py-3 text-left font-semibold">
                          Session #
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Check-In
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Check-Out
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Duration
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Out Time
                        </th>
                        <th className="px-4 py-3 text-left font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.sessions.map((session, idx) => (
                        <tr
                          key={session.id || idx}
                          className={`${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          } border-b border-gray-200 hover:bg-gray-100 transition-colors`}
                        >
                          <td className="px-4 py-3 font-semibold text-[#00416A]">
                            {session.sequence}
                          </td>
                          <td className="px-4 py-3 font-mono text-[#0064a2]">
                            {session.check_in}
                          </td>
                          <td className="px-4 py-3 font-mono text-[#0064a2]">
                            {session.check_out || "-"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-[#00416A]">
                            {session.duration_formatted}
                          </td>
                          <td className={`px-4 py-3 font-semibold rounded-md ${getOutTimeColorClass(session.out_time_minutes)}`}>
                            {session.out_time_formatted}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                session.status === "Completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {session.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              {sessions.total_sessions > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex flex-col md:flex-row gap-3 items-end">
                    <div className="flex-1">
                      <label className="text-sm font-semibold text-[#00416A] block mb-2 montserrat">
                        Download Period:
                      </label>
                      <select
                        value={downloadPeriod}
                        onChange={(e) => setDownloadPeriod(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0064a2]"
                      >
                        <option value="today">Today</option>
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="alltime">All Time</option>
                      </select>
                    </div>
                    <button
                      onClick={downloadSessionData}
                      className="px-6 py-2 bg-[#10B981] text-white rounded-lg hover:bg-[#059669] transition-colors font-semibold flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExpandableSessionDetails;
