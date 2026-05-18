import React, { useState, useEffect } from "react";
import axios from "axios";
import { HOST } from "../utils/constants";

const SessionMetrics = ({ employeeId }) => {
  const [period, setPeriod] = useState("today");
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, [period, employeeId]);

  const fetchMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(
        `${HOST}/api/attendance/session-statistics`,
        {
          params: {
            employeeId,
            period,
          },
          withCredentials: true,
        }
      );
      setMetrics(response.data);
    } catch (err) {
      console.error("Error fetching session metrics:", err);
      setError("Failed to load metrics");
    } finally {
      setLoading(false);
    }
  };

  if (!metrics) {
    return null;
  }

  return (
    <div className="w-full px-12 py-6 bg-white rounded-xl shadow-md">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-[#00416A] montserrat">
          Session Details
        </h2>
        <div className="flex gap-2">
          {["today", "month", "alltime"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-md font-semibold transition-all ${
                period === p
                  ? "bg-[#FFC107] text-[#00416A]"
                  : "bg-[#E0E0E0] text-[#666]"
              }`}
            >
              {p === "today" ? "Today" : p === "month" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-8 text-gray-500">Loading metrics...</div>
      )}

      {!loading && (
        <div className="grid grid-cols-2 gap-4">
          {/* Times Entered */}
          <div className="bg-gradient-to-br from-[#0064a2] to-[#00416A] text-white p-5 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <p className="text-sm font-semibold opacity-90">Times Entered</p>
            <p className="text-4xl font-bold mt-2">{metrics.total_cycles}</p>
            <p className="text-xs mt-2 opacity-75">
              {metrics.active_sessions > 0
                ? `${metrics.active_sessions} currently inside`
                : "No active session"}
            </p>
          </div>

          {/* Times Exited */}
          <div className="bg-gradient-to-br from-[#7B1FA2] to-[#4A148C] text-white p-5 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <p className="text-sm font-semibold opacity-90">Times Exited</p>
            <p className="text-4xl font-bold mt-2">{metrics.completed_sessions}</p>
            <p className="text-xs mt-2 opacity-75">
              {metrics.total_cycles - metrics.completed_sessions > 0
                ? `${metrics.total_cycles - metrics.completed_sessions} session(s) still open`
                : "All sessions closed"}
            </p>
          </div>

          {/* Total Time Inside */}
          <div className="bg-gradient-to-br from-[#4CAF50] to-[#2E7D32] text-white p-5 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <p className="text-sm font-semibold opacity-90">Total Time Inside</p>
            <p className="text-4xl font-bold mt-2">
              {metrics.formatted.total_time_inside}
            </p>
            <p className="text-xs mt-2 opacity-75">
              {metrics.total_time_inside_minutes} min total inside
            </p>
          </div>

          {/* Total Time Outside */}
          <div className="bg-gradient-to-br from-[#FFA726] to-[#E65100] text-white p-5 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
            <p className="text-sm font-semibold opacity-90">Total Time Outside</p>
            <p className="text-4xl font-bold mt-2">
              {metrics.formatted.total_time_outside}
            </p>
            <p className="text-xs mt-2 opacity-75">
              {metrics.total_time_outside_minutes} min total outside
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionMetrics;
