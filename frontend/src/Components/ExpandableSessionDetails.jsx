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
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="w-full px-12 py-6 bg-white rounded-xl shadow-md mt-6">
      <button
        onClick={handleToggleExpand}
        className="w-full flex items-center justify-between py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-[#00416A] montserrat">
            Detailed Sessions
          </h3>
          {sessions && (
            <span className="text-sm bg-[#FFC107] text-[#00416A] px-3 py-1 rounded-full font-semibold">
              {sessions.total_sessions}
            </span>
          )}
        </div>
        <div
          className={`text-2xl transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        >
          v
        </div>
      </button>

      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          <div className="mb-4">
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

          {!sessions && !loading && (
            <button
              onClick={fetchSessionDetails}
              className="px-4 py-2 bg-[#0064a2] text-white rounded-lg hover:bg-[#00416A] transition-colors font-semibold mb-4"
            >
              Load Sessions
            </button>
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
          )}
        </div>
      )}
    </div>
  );
};

export default ExpandableSessionDetails;
